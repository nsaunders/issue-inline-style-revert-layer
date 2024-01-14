const mdnData = require("mdn-data");

const Chance = require("chance"),
  chance = new Chance();

const CssDeclarationValueGenerator = require("css-generators/lib/CssDeclarationValueGenerator");

function generateValue(propertyName, chance) {
  const generator = new CssDeclarationValueGenerator({
    propertyName,
    experimental: false,
  });
  const { initial } = mdnData.css.properties[propertyName];
  let value = generator.generate(chance);
  for (let i = 0; i < 100; i++) {
    if (value !== initial) {
      return value;
    }
    value = generator.generate(chance);
  }
  throw new Error(
    `Could not get non-initial value for property ${propertyName}!`
  );
}

function createTestCase() {
  return Object.fromEntries(
    Object.entries(mdnData.css.properties)
      .filter(([, data]) => data.status === "standard")
      .map(([propertyName]) => [
        propertyName,
        generateValue(propertyName, chance),
      ])
  );
}

function test() {
  const id = "test";

  const styleElement = document.createElement("style");
  document.head.appendChild(styleElement);

  const testElement = document.createElement("div");
  testElement.id = id;
  document.body.appendChild(testElement);

  const results = Object.entries(createTestCase()).map(
    ([kebabProperty, value]) => {
      const camelProperty = kebabProperty.replace(/\-[a-z]/g, (x) =>
        x.substring(1).toUpperCase()
      );

      testElement.style[camelProperty] = value;
      const expected = getComputedStyle(testElement)[camelProperty];

      testElement.style.removeProperty(camelProperty);

      styleElement.innerHTML = `#${id} { ${kebabProperty}: ${value}; }`;
      testElement.style[camelProperty] = "revert-layer";
      const actual = getComputedStyle(testElement)[camelProperty];

      styleElement.innerHTML = "";
      testElement.style.removeProperty(camelProperty);

      return {
        property: kebabProperty,
        testValue: value,
        expected,
        actual,
      };
    }
  );

  document.head.removeChild(styleElement);
  document.body.removeChild(testElement);

  return results;
}

function truncate(value) {
  const str = `${value}`;
  return str.length > 50 ? `${str.substring(0, 47)}...` : str;
}

const tableHTML = [
  `<table style="border-spacing:0"><thead><tr>${[
    "Property",
    "Test Value",
    "Expected",
    "Actual",
    "Pass",
  ]
    .map((x) => `<th style="text-align: left">${x}</th>`)
    .join("")}</tr></thead><tbody>`,
  ...test()
    .sort((a, b) =>
      a.expected !== a.actual && b.expected === b.actual
        ? -1
        : a.expected === a.actual && b.expected !== b.actual
        ? 1
        : 0
    )
    .map(
      ({ property, testValue, expected, actual }, i) =>
        `<tr>${[
          property,
          truncate(testValue),
          truncate(expected),
          truncate(actual),
          `<div style="width:16px;height:16px;background:${
            expected === actual ? "green" : "red"
          };border-radius:${expected === actual ? "999px" : "0"};"></div>`,
        ]
          .map(
            (x) =>
              `<td${i % 2 === 0 ? ' style="background:#eee"' : ""}>${x}</td>`
          )
          .join("")}</tr>`
    ),
  "</tbody></table>",
].join("");

const table = document.createElement("div");
table.innerHTML = tableHTML;

document.body.appendChild(table);
