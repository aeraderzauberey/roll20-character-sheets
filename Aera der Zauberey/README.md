`adz.html` is generated using a [Nunjucks template](https://mozilla.github.io/nunjucks/templating.html). To update it,
invoke [nunjucks-cli](https://www.npmjs.com/package/nunjucks-cli) inside the `src` directory as follows:

    nunjucks adz.njk structure.json -p . -o .. --options nunjucks.json
