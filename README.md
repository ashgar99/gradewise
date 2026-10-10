<p align="center"><img src="docs/logo.svg" width="72" height="72" alt=""></p>
<h3 align="center">Gradewise</h3>
<p align="center">Work out your UK degree classification so far, and the marks you need for a First or a 2:1.</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/github/license/ashgar99/gradewise?color=brightgreen" /></a>
  <img alt="Runs in your browser" src="https://img.shields.io/badge/runs-in%20your%20browser-blue" />
  <img alt="No sign-up" src="https://img.shields.io/badge/sign--up-not%20required-blue" />
</p>

<p align="center"><a href="https://ashgar99.github.io/gradewise/"><b>Open Gradewise</b></a></p>


## Features ✨

- Enter your modules, credits and marks for your second and final years. Leave marks blank if they have not come back yet.
- Choose a common weighting (1:2, 1:3, 40:60, equal, or final year only) or set your own.
- Shows your weighted average so far, your classification, and when you are within 2% of the next boundary.
- Works out the average you need across your remaining modules for a First, 2:1, 2:2 and Third.
- Remembers your marks in your browser, so you can come back after each result.
- Runs entirely in your browser. Nothing is uploaded.


## How it is worked out 🧮

1. Each year's average is weighted by credits, so a 30-credit module counts twice as much as a 15-credit one.
2. Year averages are combined using your degree's weighting.
3. Modules without a mark are treated as one shared average, and Gradewise solves for the value that reaches each boundary.

Rules vary between universities. Some discount your lowest marks, review borderline cases, or use a "preponderance" rule. Treat Gradewise as a guide and check your programme handbook.


## Browser support 🌐

Works in current versions of Chrome, Edge, Brave, Firefox and Safari, on computers, tablets and phones.

## Troubleshooting 🔧

| Problem | Solution |
| --- | --- |
| The average shows a dash | Add at least one mark, and check the weighting is not 0% for that year. |
| Numbers look wrong | Check each module's credits. Most full years add up to 120 credits. |


## Privacy and security 🔒

Gradewise is a single page with no server. Your marks are stored only in your own browser's local storage on that device.


## Development 🧩

The whole app lives in [`docs/`](docs): `index.html` for the page and `gradewise.js` for the logic. There is no build step.


## Unikit 🎒

Gradewise is part of Unikit, a set of free tools for students: [Modzip](https://ashgar99.github.io/moodle-module-downloader/), [Subzip](https://ashgar99.github.io/subzip/), [Duecal](https://ashgar99.github.io/duecal/), [Termcal](https://ashgar99.github.io/termcal/), [Wordfair](https://ashgar99.github.io/wordfair/) and [Readable](https://ashgar99.github.io/readable/).

Gradewise is not affiliated with or endorsed by Moodle or any university.


## Licence 📑

[MIT](LICENSE)
