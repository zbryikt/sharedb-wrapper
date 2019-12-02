/* wrap json0-ot-diff and diff-match-patch for browser */
require! <[json0-ot-diff diff-match-patch]>
module.exports = {json0-ot-diff, diff-match-patch}
if window? => window <<< {json0-ot-diff, diff-match-patch}
