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

- Import your marks straight from Moodle with the Gradewise bookmark, including Turnitin grades, assessment weights and submission dates.
- Upload your university's regulations, and Gradewise finds the year weightings, grade boundaries and late penalty rules, quoting each one for you to check.
- See which assessments were submitted late and the penalty your rules would give, with a switch to apply it.
- Enter or edit your modules, credits and marks for your second and final years. Leave marks blank if they have not come back yet.
- Choose a common weighting (1:2, 1:3, 40:60, equal, or final year only) or set your own.
- Shows your weighted average so far, your classification, and when you are within 2% of the next boundary.
- Works out the average you need across your remaining modules for a First, 2:1, 2:2 and Third.
- Remembers your marks in your browser, so you can come back after each result.
- Runs entirely in your browser. Nothing is uploaded.


## Importing from Moodle 🎓

1. Go to [Gradewise](https://ashgar99.github.io/gradewise/) and drag the **Gradewise** button from *Start from Moodle* onto your bookmarks bar.
2. Log in to Moodle, click the bookmark, and choose **This module** or **All modules**. Keep the tab open while your marks are collected.
3. Click **Open in Gradewise**. Check each module, add any assessments that are missing, and choose which academic year counts as your second and final year.
4. Click **Use these marks** to fill in the calculator.

Gradewise reads your marks from each assignment page, the Turnitin submissions table and, where your university shows it, the Moodle gradebook, which also gives each assessment's weight. Where no weights are shown, assessments count equally until you enter them. Module credits are read from names such as "(30Cr)" where possible; otherwise check them yourself.

### Late penalties

Late assessments are flagged with how late they were. Once your late penalty rules are filled in, Gradewise shows the penalty they would give, and you can tick **Apply this penalty** to use it. Moodle sometimes shows marks that already include a penalty, so only apply it if your mark has not already been reduced.

### Your university's rules

Drop your degree regulations or programme handbook (PDF, Word or text) into *Your university's rules*, or paste the relevant section. Gradewise looks for:

- year weightings, such as "Level 5 contributes 25% and Level 6 contributes 75%";
- classification boundaries, such as "First Class Honours: 70% and above";
- late penalties, such as "5 marks deducted for each working day late", a mark of zero after a number of days, a cap on late work, or a rule that a penalty cannot take a passing mark below the pass mark.

Each rule it finds is shown with the sentence it came from, so you can untick anything it has misread. You can also enter or change any rule by hand.


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
| A module's mark looks wrong after importing | Check the weights. Moodle only shows them if your university uses the gradebook, so you may need to enter them. |
| A rule was not found in my regulations | Wording varies between universities. Enter the rule by hand under *Your university's rules*. |
| Marks are missing for an assessment | Some marks are not released until a later date. Add them by hand when they come back. |


## Privacy and security 🔒

Gradewise is a single page with no server. Your marks are stored only in your own browser's local storage on that device.

The Moodle bookmark only talks to your own Moodle site, using the login you already have. It passes your marks to Gradewise in the part of the address after the `#` sign, which browsers never send to a server, and Gradewise removes them from the address as soon as the page opens. Regulations you upload are read in your browser and never leave your computer.


## Development 🧩

The page lives in [`docs/`](docs): `gradewise.js` for the calculator and `gradewise-moodle.js` for imported marks, rules and late penalties. The Moodle bookmark is [`gradewise-import.js`](gradewise-import.js). After editing it, run `node build.js` to regenerate `bookmarklet.txt` and `docs/index.html` from `site/index.template.html`.


## Unikit 🎒

Gradewise is part of Unikit, a set of free tools for students: [Modzip](https://ashgar99.github.io/moodle-module-downloader/), [Subzip](https://ashgar99.github.io/subzip/), [Duecal](https://ashgar99.github.io/duecal/), [Termcal](https://ashgar99.github.io/termcal/), [Wordfair](https://ashgar99.github.io/wordfair/) and [Readable](https://ashgar99.github.io/readable/).

Gradewise is not affiliated with or endorsed by Moodle or any university.


## Licence 📑

[MIT](LICENSE)
