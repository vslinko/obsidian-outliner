# Obsidian Outliner

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vslinko/obsidian-outliner/Release?logo=github&style=for-the-badge)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/vslinko/obsidian-outliner?style=for-the-badge&sort=semver)

**Work with your lists like in Workflowy or RoamResearch**

⁉️ [Discuss ideas or ask a question](https://github.com/vslinko/obsidian-outliner/discussions)<br>
⚙️ [Follow the development process](https://github.com/vslinko/obsidian-outliner/projects/1)<br>
🐛 [Report issues](https://github.com/vslinko/obsidian-outliner/issues)

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

> **Disclaimer:** Styles are only compatible with built-in Obsidian themes and may not be compatible with other themes. Styles only work well with spaces or four-space tabs.

| Setting                         | Default value |
| ------------------------------- | :-----------: |
| Improve the style of your lists |    `false`    |

### Move lists back and forth

Move lists with children wherever you want without breaking the structure.

| Command                       |       Default hotkey (Windows/Linux)        |             Default hotkey (MacOS)             |
| ----------------------------- | :-----------------------------------------: | :--------------------------------------------: |
| Move list and sublists up     | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↑</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↑</kbd> |
| Move list and sublists down   | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↓</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↓</kbd> |
| Indent the list and sublists  |               <kbd>Tab</kbd>                |                 <kbd>Tab</kbd>                 |
| Outdent the list and sublists |       <kbd>Shift</kbd><kbd>Tab</kbd>        |         <kbd>Shift</kbd><kbd>Tab</kbd>         |

### Stick the cursor to the content

Don't let the cursor move to the bullet position.

| Setting                         | Default value |
| ------------------------------- | :-----------: |
| Stick the cursor to the content |    `true`     |

### Enhance the Enter key

Make the Enter key behave the same as other outliners.

| Setting               | Default value |
| --------------------- | :-----------: |
| Enhance the Enter key |    `true`     |

### Fold and unfold your lists

| Command         | Default hotkey (Windows/Linux) |     Default hotkey (MacOS)     |
| --------------- | :----------------------------: | :----------------------------: |
| Fold the list   |  <kbd>Ctrl</kbd><kbd>↑</kbd>   | <kbd>Command</kbd><kbd>↑</kbd> |
| Unfold the list |  <kbd>Ctrl</kbd><kbd>↓</kbd>   | <kbd>Command</kbd><kbd>↓</kbd> |

### Select a list item or the entire list

Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list.

| Command                               | Default hotkey (Windows/Linux) |     Default hotkey (MacOS)     |
| ------------------------------------- | :----------------------------: | :----------------------------: |
| Select a list item or the entire list |  <kbd>Ctrl</kbd><kbd>a</kbd>   | <kbd>Command</kbd><kbd>a</kbd> |

### Zoom in to a specific list item

Hide everything except the list and its children.

![Zoom Demo](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demo2.gif)

| Command                          |       Default hotkey (Windows/Linux)        |             Default hotkey (MacOS)             |
| -------------------------------- | :-----------------------------------------: | :--------------------------------------------: |
| Zoom in to the current list item |         <kbd>Ctrl</kbd><kbd>.</kbd>         |         <kbd>Command</kbd><kbd>.</kbd>         |
| Zoom out the entire document     | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>.</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>.</kbd> |

| Setting                                | Default value |
| -------------------------------------- | :-----------: |
| Zooming in when clicking on the bullet |    `true`     |

### Debug mode

Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.

| Setting    | Default value |
| ---------- | :-----------: |
| Debug mode |    `false`    |

## Pricing

This plugin is free for everyone, however, if you would like to thank me
or help with further development, you can donate in one of the following ways:

[![Patreon](https://img.shields.io/badge/patreon-vslinko-orange?logo=patreon&style=social)](https://patreon.com/vslinko)<br>
[![Paypal](https://img.shields.io/badge/paypal-vslinko-orange?logo=paypal&style=social)](https://www.paypal.me/vslinko)

### Patrons & Supporters

I want to say thank you to the people who support me, I really appreciate it!

- [Lucas D](https://twitter.com/lucasdreier)
- more patrons and anonymous supporters
