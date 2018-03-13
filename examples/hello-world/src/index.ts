import { interval } from 'rxjs/observable/interval';
import { zip } from 'rxjs/observable/zip';
import * as op from 'rxjs/operators';
import { html, render } from 'retemplate';

const name = 'Simon';

const now$ = interval(1000).pipe(
  op.startWith(0),
  op.map(() => new Date().toString()),
  op.tap(console.log),
);

const greeting = html`
<h2>Hello, ${name}!</h2>
`;

const showTime = html`
<p>The current time is: ${now$}
`;

const items = [greeting, showTime];
const item$ = interval(5000).pipe(
  op.startWith(-1),
  op.map(index => items[(index + 1) % 2]),
);

const example$ = zip(
  item$,
  interval(5000).pipe(op.startWith(0)),
  x => x,
);

// If we render directly into document.body, then the script tag gets removed
// and this doesn't work for some reason.
// const rootElement = document.createElement('div');
// rootElement.id = 'root';
// document.body.appendChild(rootElement);
const rootElement = document.body;

render(
  html`
<h1>Observable templating example!</h1>
${example$}
<p> This will toggle between showing my name and the current time.
<p> Open up the console, and note that the timer is stopped while it is not visible!
`,
  rootElement,
);
