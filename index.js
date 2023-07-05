const core = require('@actions/core')

const { addLabel, closeIssue, createAndInviteToRepo, getIssue, getRepo, leaveComment } = require('./github')
const { recognizeTitle } = require('./bot')

async function run () {
  try {
    const token = core.getInput('github-token')
    const { owner, repo } = getRepo()
    const issue = await getIssue(token)
    const { type: label, title } = recognizeTitle(issue.title)
    if (label) {
      await addLabel(token, owner, repo, issue.number, label)
    }
    if (label === 'invalid') {
      await leaveComment(token, owner, repo, issue.number,
        'It seems like your request has an invalid package name, please consider another package name. (e.g. `io.github.' + owner + '.[appname]`)' +
        "If that's not true, please contact a human by " +
        'https://modules.lsposed.org/submission?type=appeal'
      )
      await closeIssue(token, owner, repo, issue.number)
    }
    if (label === 'submission') {
      const result = await createAndInviteToRepo(token, owner, issue.user.login, title)
      if (result) {
        await leaveComment(token, owner, repo, issue.number,
          'Dear developer,\n\n' +
          'We created a repository https://github.com/Xposed-Modules-Repo/' + title +
          ' for you. You should find yourself as admin role of the repo now, if you ' +
          "don't, check your email to accept invitation. Enjoy!"
        )
        await addLabel(token, owner, repo, issue.number, 'approved')
        await leaveComment(token, owner, repo, issue.number,
          'To make your repository appear in the app and website, here is what you need to do,\n' +
          "- Make sure you're not leaving the GitHub repo description blank, which indicates the Xposed module display name.\n" +
          '- Make sure you have at least one release.\n\n' +
          "If you complied with those requirements but your repo didn't appear in more than 10 minutes, please file an issue to let us know, thanks!"
        )
        await leaveComment(token, owner, repo, issue.number,
          'Welcome `' + title + '`!'
        )
        await closeIssue(token, owner, repo, issue.number)
      } else {
        await leaveComment(token, owner, repo, issue.number,
          'It seems like your package name is already in use, please consider another package name. (e.g. `io.github.' + owner + '.' + title.split('.').slice(-1) + '`)' +
          "If you believe that's a fraudulent use, please contact a human by " +
          'https://modules.lsposed.org/submission?type=appeal'
        )
        await addLabel(token, owner, repo, issue.number, 'conflict')
        await closeIssue(token, owner, repo, issue.number)
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
