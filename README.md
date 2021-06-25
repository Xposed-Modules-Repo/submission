# Submission
Submit your Xposed Modules!

### How to
To submit your module, please fire an issue with title `[submission] packagename`, where `packagename` is the package name of your module. Then our bot will automatically create a new repository and invite you to be the admin.

### Repository structure
- Title: the package name of your module (for example `com.example.xposedmodule`)
- Description: the name of your module (for example `Example Xposed Module`)
- Collaborators: authors of the module
- Release Title: the version name
- Release Content: the changelog
- Release Tag: [version code]-[version name] (if you create the release along with apk assets, bot will automatically update it)
- Home Page: the support link

### Repository content
- SUMMARY: the summary of your module, will be shown in the front page
- README.md: the full description of your module
- For all meta files available please refer to [the example repository](https://github.com/Xposed-Modules-Repo/org.meowcat.example)

### Important notes
1. If your repository is incomplete, it won't be shown
2. Update of your repositiory will automatically trigger [build](https://github.com/Xposed-Modules-Repo/modules/actions/workflows/build.yml) and be shown in 5min
3. If you want your module's update to be shown, please tag it correctly with the apk. (As long as you submit the release with the apk, bot will automatically [update](https://github.com/Xposed-Modules-Repo/modules/actions/workflows/tag.yml) your tag. However, if you edit the release by **only** changing the apk, bot [cannot know](https://stackoverflow.com/questions/37437581/listening-to-release-asset-changes-with-github-webhooks) your editting and the tag won't be updated. So for the best practice, always submit release with valid apk.

## Transfer
If you want to transfer an existing repo to the modules repo, please fire an issue with title `[transfer] packagename` and transfer the ownership of your original repo to our orginization.
