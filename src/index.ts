import { setFailed } from '@actions/core'

import { setLabel, closeIssue, createAndInviteToRepo, getIssue, getRepo, isRepoExists, leaveComment, lockSpamIssue, orgBlockUser, repoInvite } from './github.js'
import { checkTxt, checkPages, recognizeTitle, checkOrg, normalizeUsername, isStartsWithDigit } from './bot.js'
import { context } from '@actions/github'

async function approveTransfer(token: string, owner: string, repo: string, issueNo: number, username: string, title: string) {
  const ok = await repoInvite(token, owner, username, title)
  if (ok) {
    await leaveComment(token, owner, repo, issueNo,
      'Dear developer,\n\n' +
      'You should find yourself as maintain role of the repo now, if you ' +
      "don't, check your email or [here](https://github.com/Xposed-Modules-Repo/" + title + "/invitations) to accept invitation."
    )
    await setLabel(token, owner, repo, issueNo, ['approved']) // clear other labels
    await closeIssue(token, owner, repo, issueNo, true)
  } else {
    await leaveComment(token, owner, repo, issueNo,
      'error: failed to invite'
    )
    await setLabel(token, owner, repo, issueNo, ['invalid']) // clear other labels
    await closeIssue(token, owner, repo, issueNo)
  }
}

async function approve(token: string, owner: string, repo: string, issueNo: number, username: string, title: string) {
  const result = await createAndInviteToRepo(token, owner, username, title)
  if (result) {
    await leaveComment(token, owner, repo, issueNo,
      'Dear developer,\n\n' +
      'We created a repository https://github.com/Xposed-Modules-Repo/' + title +
      ' for you. You should find yourself as maintain role of the repo now, if you ' +
      "don't, check your email or [here](https://github.com/Xposed-Modules-Repo/" + title + "/invitations) to accept invitation. Enjoy!\n\n" +
      'To make your repository appear in the app and website, here is what you need to do,\n' +
      "- Make sure you're not leaving the GitHub repository description blank, which indicates the Xposed module display name. (**DO IT IN WEB BROWSER, API DON'T HAVE ENOUGH PERMISSION TO SET IT, WHOEVER IGNORE THIS, YOU HAVE BEEN WARNED**)\n" +
      '- Make sure you have at least one release.\n\n' +
      "If you complied with those requirements but your repo didn't appear in more than 60 minutes (this countdown starts after you complied *ALL OF THE REQUIREMENTS* including repository description), please file an issue to let us know, , thanks!\n\n" +
      'Welcome `' + title + '`!'
    )
    await setLabel(token, owner, repo, issueNo, ['approved']) // clear other labels
    await closeIssue(token, owner, repo, issueNo, true)
  } else {
    const escapedUsername = normalizeUsername(username)
    await leaveComment(token, owner, repo, issueNo,
      'It seems like your package name is already in use, please consider another package name ' +
      '(e.g. `io.github.' + escapedUsername + '.' + title.split('.').slice(-1) + '`).\n' +
      "If you believe that's a fraudulent use, please contact a human by " +
      'https://modules.lsposed.org/submission?type=appeal'
    )
    await setLabel(token, owner, repo, issueNo, ['conflict']) // clear other labels
    await closeIssue(token, owner, repo, issueNo)
  }
}

async function closeSpam(token: string, owner: string, repo: string, issueNo: number) {
  await setLabel(token, owner, repo, issueNo, ['spam']) // clear other labels
  await closeIssue(token, owner, repo, issueNo)
  await lockSpamIssue(token, owner, repo, issueNo)
}

async function closeInvalid(token: string, owner: string, repo: string, issueNo: number, username: string, close: boolean = true) {
  await setLabel(token, owner, repo, issueNo, ['invalid']) // clear other labels
  if (isStartsWithDigit(username)) {
     await leaveComment(token, owner, repo, issueNo,
      'Your username starts with a digit which can not be use as a valid namespace, ' +
      'please consider creating an organization or purchase a domain with a valid username, ' +
      'and add a TXT record to your root domain:\n\n' +
      '> `lsposed-modules-repo-verification=' + username + '`\n\n' +
      "If that's doesn't help, please contact a human by " +
      'https://modules.lsposed.org/submission?type=appeal'
    )
  } else {
    const escapedUsername = normalizeUsername(username)
    await leaveComment(token, owner, repo, issueNo,
      'It seems like your request has an invalid package name, please consider another package name ' +
      '(e.g. `io.github.' + escapedUsername + '.[appname]`).\n' +
      'If you owned the domain of your APK Application ID, you can add a TXT record to your root domain for quick approve:\n\n' +
      '> `lsposed-modules-repo-verification=' + username + '`\n\n' +
      "If that's doesn't help, please contact a human by " +
      'https://modules.lsposed.org/submission?type=appeal'
    )
  }
  if (close) await closeIssue(token, owner, repo, issueNo)
}

async function run() {
  try {
    const sender_id = context?.payload?.sender?.id
    if (sender_id === 78363386) return // ignore bot

    const token = process.env.REPO_TOKEN
    if (token === undefined || token === '') throw Error("REPO_TOKEN is missing")

    const { owner, repo } = getRepo()
    const issue = await getIssue(token)
    const { type: prefixTag, title } = recognizeTitle(issue.title)
    const action = context.payload.action

    const issueNo = issue.number
    const username = issue?.user?.login
    if (username === undefined) return

    if (action === 'edited' && context.payload.changes.title !== undefined) {
      if (prefixTag === 'invalid') {
        await closeInvalid(token, owner, repo, issueNo, username, false)
      }
    } else if (action === 'labeled') {
      const newLabel = context.payload.label.name
      if (prefixTag === 'invalid') {
        await closeInvalid(token, owner, repo, issueNo, username, false)
      } else if (newLabel === 'spam') {
        await closeSpam(token, owner, repo, issueNo)
      } else if (newLabel === 'approved' && prefixTag === 'submission' && title) {
        await approve(token, owner, repo, issueNo, username, title)
      } else if (prefixTag === 'transfer' && newLabel === 'approved') {
        await approveTransfer(token, owner, repo, issueNo, username, title)
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
        if (title.startsWith('io.github.')) {
          if (checkPages(title, username) || await checkOrg(token, title, username)) {
            await approve(token, owner, repo, issueNo, username, title)
            return
          }
        } else if (await checkTxt(title, username)) {
          await approve(token, owner, repo, issueNo, username, title)
          return
        }
        await closeInvalid(token, owner, repo, issueNo, username)
        return
      }

      // transfer
      if (prefixTag === 'transfer') {
        const isExists = await isRepoExists(token, owner, repo)
        if (!isExists) {
          await closeSpam(token, owner, repo, issueNo)
          return
        }
      }

      // appeal, issue, suggestion
    }
  } catch (e) {
    if (e instanceof Error)
      setFailed(e.message)
    else if (typeof e === 'string')
      setFailed(e)
  }
}

run()
