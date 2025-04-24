const core = require('@actions/core')

const { addLabel, setLabel, closeIssue, createAndInviteToRepo, getIssue, getRepo, leaveComment, lockSpamIssue, orgBlockUser, getUser } = require('./github')
const { recognizeTitle } = require('./bot')
const { context } = require('@actions/github')

async function approve (token, owner, repo, issueNo, username, title) {
  const result = await createAndInviteToRepo(token, owner, username, title)
  if (result) {
    await leaveComment(token, owner, repo, issueNo,
      'Dear developer,\n\n' +
      'We created a repository https://github.com/Xposed-Modules-Repo/' + title +
      ' for you. You should find yourself as admin role of the repo now, if you ' +
      "don't, check your email to accept invitation. Enjoy!\n\n" +
      'To make your repository appear in the app and website, here is what you need to do,\n' +
      "- Make sure you're not leaving the GitHub repo description blank, which indicates the Xposed module display name.\n" +
      '- Make sure you have at least one release.\n\n' +
      "If you complied with those requirements but your repo didn't appear in more than 10 minutes, please file an issue to let us know, thanks!\n\n" +
      'Welcome `' + title + '`!'
    )
    await setLabel(token, owner, repo, issueNo, 'approved') // clear other labels
    await closeIssue(token, owner, repo, issueNo, true)
  } else {
    await leaveComment(token, owner, repo, issueNo,
      'It seems like your package name is already in use, please consider another package name ' +
      '(e.g. `io.github.' + username + '.' + title.split('.').slice(-1) + '`).\n' +
      "If you believe that's a fraudulent use, please contact a human by " +
      'https://modules.lsposed.org/submission?type=appeal'
    )
    await setLabel(token, owner, repo, issueNo, 'conflict') // clear other labels
    await closeIssue(token, owner, repo, issueNo)
  }
}

async function closeSpam (token, owner, repo, issueNo, username = '') { // pass username if block
  await setLabel(token, owner, repo, issueNo, 'spam') // clear other labels
  await closeIssue(token, owner, repo, issueNo)
  await lockSpamIssue(token, owner, repo, issueNo)
  if (username !== '') await orgBlockUser(token, owner, username)
}

async function closeInvalid (token, owner, repo, issueNo, username) {
  await leaveComment(token, owner, repo, issueNo,
    'It seems like your request has an invalid package name, please consider another package name ' +
    '(e.g. `io.github.' + username + '.[appname]`).\n' +
    "If that's not true, please contact a human by " +
    'https://modules.lsposed.org/submission?type=appeal'
  )
  await closeIssue(token, owner, repo, issueNo)
}

async function manualRequest (token, owner, repo, issueNo) {
  await leaveComment(token, owner, repo, issueNo,
    'To reduce spam, we do not approve your submission immediately due to certain conditions, ' +
    'please wait for manual approvement.'
  )
}

async function run () {
  try {
    if (context.payload.sender.id === 78363386) return // ignore bot

    const token = core.getInput('github-token')
    const { owner, repo } = getRepo()
    const issue = await getIssue(token)
    const { type: prefixTag, title } = recognizeTitle(issue.title)
    const action = context.payload.action

    const issueNo = issue.number
    const username = issue.user.login

    if (action === 'labeled') {
      const newLabel = context.payload.label.name
      if (newLabel === 'spam') {
        await closeSpam(token, owner, repo, issueNo, username)
      } else if (newLabel === 'approved' && prefixTag === 'submission' && title) { // TODO: transfer
        await approve(token, owner, repo, issueNo, username, title)
      }
    } else if (action === 'opened') {
      // close missing tag issue
      if (!prefixTag) {
        await closeSpam(token, owner, repo, issueNo)
        return
      }

      // close invalid package name issue
      if (prefixTag === 'invalid') {
        await closeInvalid(token, owner, repo, issueNo, username)
        return
      }

      // submission
      if (prefixTag === 'submission') {
        // const user = await getUser(token, username)
        // const createdAtDiffMs = new Date() - new Date(user.data.created_at)
        // const isNewAccount = createdAtDiffMs < 1000 * 60 * 60 * 24 * 7 /* 7 days */
        // const isNoFollowers = user.data.followers <= 0
        // if (isNewAccount || isNoFollowers) {
        if (true)
          await manualRequest(token, owner, repo, issueNo)
          return
        }
        await approve(token, owner, repo, issueNo, username, title)
      }
      // transfer, appeal, issue, suggestion
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
