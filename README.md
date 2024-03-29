# Joplin Hotfolder Plugin <img src="img/icon_32.png">

A plugin to Monitor a locale folder and import the files as a new note.

<img src="img/main.png">

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `Hotfolder`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.jackgruber.hotfolder.jpl`) from [here](https://github.com/JackGruber/joplin-plugin-hotfolder/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

First configure the Plugin under `Tools > Options > Hotfolder`!

Each newly created file in the hotfolder is automatically created as a new note.
The files are added as attachments unless the file extension is defined as `Add as text`.
After processing the file are deleted from the hotfolder.

## Options

Go to `Tools > Options > Backup`

| Option              | Description                                                                                                                                                                          | Default                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Hotfolder Path      | Files from this path will be imported as new notes.                                                                                                                                  |                                   |
| Ignore Files        | Comma separated list of files to be ignored.<br>Wildcards (`*`) or RegExp possible.<br>To ignore a file with a `*` in the name, escape the `*` with a `\`, example: `test\*file.log` | `.*` (Dot files like `.DS_Store`) |
| Add as text         | Files with this file extension are imported as text and not as attachment.                                                                                                           | .txt, .md                         |
| Add text as Todo    | When checked, text notes will be imported as Todo type notes.                                                                                                                        |                                   |
| Notebook            | In which notebook should the note be created. <br> Subnotebooks can be defined via `Project\Scans`.                                                                                  | Current selected Notebook         |
| Tag                 | Comma separated list of tags to be added to the note.                                                                                                                                |                                   |
| Numer of Hotfolders | How many hot folders should be defined (Only available in the first hotfolder configuration).                                                                                        | 1                                 |

## Changelog

See [CHANGELOG.md](CHANGELOG.md)
