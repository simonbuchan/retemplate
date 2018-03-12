import * as Rx from 'rxjs';
import { html, render } from '../../../src/index';

const name = 'Simon';

const now$ = Rx.Observable.interval(1000)
  .startWith(0)
  .map(() => new Date().toString())
  .do(console.log);

const greeting = html`
<h2>Hello, ${name}!</h2>
`;

const showTime = html`
<p>The current time is: ${now$}
`;

const items = [greeting, showTime];
const item$ = Rx.Observable.interval(5000)
  .startWith(-1)
  .map(index => items[(index + 1) % 2]);

const example$ = Rx.Observable.zip(
  item$,
  Rx.Observable.interval(5000).startWith(0),
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
