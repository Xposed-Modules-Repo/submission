function recognizeTitle (title) {
  const match = title.match(/^\[([^\]]+)]\s*(.*?)\s*$/)
  if (match) {
    match[1] = match[1].toLowerCase()
    if ([
      'submission',
      'transfer',
      'appeal',
      'issue',
      'suggestion'
    ].indexOf(match[1]) !== -1) {
      if (match[1] === 'submission' || match[1] === 'transfer') {
        return {
          type: checkPackageName(match[2]) ? match[1] : 'invalid',
          title: match[2]
        }
      }
      return {
        type: match[1],
        title: match[2]
      }
    }
  }
  return {
    type: '',
    title: title
  }
}

function checkPackageName (packageName) {
  if (!packageName.match(/\./)) return false
  const groups = packageName.split('.')
  for (const group of groups) {
    if (!group.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) || group.toLowerCase() === 'example') return false
  }
  const two = groups[0] + '.' + groups[1]
  const three = two + '.' + groups[2]
  if(two === 'org.lsposed' || two === 'com.google' || two === 'com.android' || three === 'io.github.lsposed') return false
  return true
}

module.exports = {
  recognizeTitle
}
