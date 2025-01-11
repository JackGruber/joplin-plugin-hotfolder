# Changelog

## not released

- Fix: Placeholder for the error message `notebookNotExist` was output instead of the translation string

## v1.2.1 (2024-11-26)

- Fix: Don't add empty tag when tag ends with `,` or contains several `,` directly behind each other #37
- Fix: Tagging did not work if multiple tags in Joplin started the same as the tag that should be added #37
- Fix: `File ready` is automatically set to `2` if it is still configured to `0` to prevent import errors with 0 byte files (File is in use by other process)

## v1.2.0 (2024-05-21)

- Add: Option `Polling` for hotfolders, which is necessary for some network drives
- Fix: Add option `File ready` to check whether a file has been written or not yet (Necessary for some use cases) #36

## v1.1.1 (2024-01-11)

- Add: Screenshots / icon for [https://joplinapp.org/plugins/](https://joplinapp.org/plugins/)

## v1.1.0 (2023-06-10)

- Fix: #24 mixed case file extentions in `Add as text` setting
- Add: DirectoryPath selector for hotfolder path on Joplin >= v2.10.4
- Add: Translation to German
- Add: Option `Add text notes as Todo` to import text files as ToDo
- Add: #29 Added warning message when importing to a non-existing notebook

## v1.0.1 (2021-08-12)

- Fix: #13 `Hotfolder Path` is missing in settings and `Ignore Files` shows wrong value

## v1.0.0 (2021-08-05)

- Improved: Use registerSettings instead of deprecated registerSetting

❗ Requires at least Joplin v1.8.1 ❗

## v0.4.0 (2021-05-06)

- Add: Wildcard and RegExp match for `Ignore Files`
- Add: `.*` (Dot files) as default for `Ignore Files`
- Optimize: Set note title without file extension #6

## v0.3.3 (2021-03-16)

- Fix: typo

## v0.3.2 (2021-02-22)

- Fix: File is not deleted on tagging error

## v0.3.1 (2021-01-29)

- Fix: Folder with a beginning dot is excluded #5

## v0.3.0 (2021-01-29)

- Add: Option for multiple Hotfolders
- Optimize: Update settings on change without Joplin reload
- Optimize: Define Subnotebooks

❗ Requires at least Joplin v1.7.1 ❗

## v0.2.0 (2021-01-27)

- Add: Option to ignore files

## v0.1.1 (2021-01-25)

- Reduce Joplin min Version to 1.6.2

## v0.1.0 (2021-01-25)

- First version
