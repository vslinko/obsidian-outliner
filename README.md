# Obsidian Outliner

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vslinko/obsidian-outliner/Release?logo=github&style=for-the-badge)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/vslinko/obsidian-outliner?style=for-the-badge&sort=semver)

**Work with your lists like in Workflowy or RoamResearch**

⁉️ [Discuss ideas or ask a question](https://github.com/vslinko/obsidian-outliner/discussions)<br>
⚙️ [Follow the development process](https://github.com/users/vslinko/projects/3/views/1)<br>
🐛 [Report issues](https://github.com/vslinko/obsidian-outliner/issues)

Compatible with [Obsidian Zoom plugin](https://github.com/vslinko/obsidian-zoom).

## Demo

![Demo](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demo.gif)

## How to install

### From within Obsidian

You can activate this plugin within Obsidian by doing the following:

- Open Settings > Third-party plugin
- Make sure Safe mode is off
- Click Browse community plugins
- Search for "Outliner"
- Click Install
- Once installed, close the community plugins window and activate the newly installed plugin

### Manual installation

Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/vslinko/obsidian-outliner/releases/latest) and put them into `<vault>/.obsidian/plugins/obsidian-outliner` folder.

## How to use

Try to create a deeply structured list and move items by pressing the hotkeys described below.

## Features

### Improve the style of your lists

If you liked the styles from the demo above, you can enable them in the plugin settings tab.

> **Disclaimer:** Styles are only compatible with built-in Obsidian themes.

| Setting                         | Default value |
| ------------------------------- | :-----------: |
| Improve the style of your lists |    `true`     |

### Move lists back and forth

Move lists with children wherever you want without breaking the structure.

| Command                       |       Default hotkey (Windows/Linux)        |             Default hotkey (MacOS)             |
| ----------------------------- | :-----------------------------------------: | :--------------------------------------------: |
| Move list and sublists up     | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↑</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↑</kbd> |
| Move list and sublists down   | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↓</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↓</kbd> |
| Indent the list and sublists  |                                             |                                                |
| Outdent the list and sublists |                                             |                                                |

| Setting             | Default value |
| ------------------- | :-----------: |
| Enhance the Tab key |    `true`     |

### Draw vertical indentation lines

![Demo of vertical indentation lines](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demo2.gif)

| Setting                                |  Default value   |
| -------------------------------------- | :--------------: |
| Draw vertical indentation lines        |     `false`      |
| Vertical indentation line click action | `Toggle Folding` |

### Stick the cursor to the content

Don't let the cursor move to the bullet position. Affects cursor movement, text deletion, text selection.

| Setting                         | Default value |
| ------------------------------- | :-----------: |
| Stick the cursor to the content |    `true`     |

### Enhance the Enter key

Make the Enter key behave the same as other outliners:

- Enter outdents list item if it's empty.
- Enter creates new line on children level if there are any children.
- Shift-Enter creates a new note line.

[More info](https://github.com/vslinko/obsidian-outliner/discussions/98#discussioncomment-649514)

| Setting               | Default value |
| --------------------- | :-----------: |
| Enhance the Enter key |    `true`     |

### Fold and unfold your lists

| Command         | Default hotkey (Windows/Linux) |     Default hotkey (MacOS)     |
| --------------- | :----------------------------: | :----------------------------: |
| Fold the list   |  <kbd>Ctrl</kbd><kbd>↑</kbd>   | <kbd>Command</kbd><kbd>↑</kbd> |
| Unfold the list |  <kbd>Ctrl</kbd><kbd>↓</kbd>   | <kbd>Command</kbd><kbd>↓</kbd> |

### Enhance the <kbd>Ctrl</kbd><kbd>A</kbd> or <kbd>Cmd</kbd><kbd>A</kbd> behavior

Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list.

| Setting                              | Default value |
| ------------------------------------ | :-----------: |
| Enhance the Ctrl+A or Cmd+A behavior |    `true`     |

### Debug mode

Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.

| Setting    | Default value |
| ---------- | :-----------: |
| Debug mode |    `false`    |


## Pricing

This plugin is free for everyone, however, if you would like to thank me
or help with further development, you can donate in one of the following ways:

[![Patreon](https://img.shields.io/badge/patreon-vslinko-orange?logo=patreon&style=social)](https://patreon.com/vslinko)

### Patrons & Supporters

I want to say thank you to the people who support me, I really appreciate it!

- [Lucas D](https://twitter.com/lucasdreier)
- Philipp K.
- [Daniel B.](https://github.com/danieltomasz)
- Mat Rhein ([@mat_rhein7](http://twitter.com/mat_rhein7))
- [Ollie Lovell](https://www.ollielovell.com/)
- Faiz MK ([@faizkhuzaimah](https://twitter.com/faizkhuzaimah))
- more patrons and anonymous supporters
