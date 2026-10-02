/** Emulates the operating system's colour-scheme preference (Chrome/Electron DevTools protocol). */
function emulateColorScheme(value: "light" | "dark") {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Emulation.setEmulatedMedia",
    params: { features: [{ name: "prefers-color-scheme", value }] },
  });
}

/** True when the page body is painted with a dark background. */
function paintedDark() {
  return cy.get("body").then(($b) => {
    const color = getComputedStyle($b[0]).backgroundColor;
    // Browsers may report lab(), lch(), oklab(), oklch() or rgb(); use lightness where given.
    const lab = /^(?:lab|lch)\(([\d.]+)/.exec(color);
    if (lab) return Number(lab[1]) < 50;
    const ok = /^(?:oklab|oklch)\(([\d.]+)(%?)/.exec(color);
    if (ok) return Number(ok[1]) / (ok[2] ? 100 : 1) < 0.5;
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  });
}

describe("Dark mode", () => {
  afterEach(() => {
    emulateColorScheme("light");
  });

  it("cycles System → Light → Dark and the server renders the saved choice", () => {
    emulateColorScheme("light");
    cy.visit("/");
    cy.get('button[aria-label^="Theme:"]').as("toggle").should("contain", "System");
    paintedDark().should("eq", false);

    cy.get("@toggle").click();
    cy.get("@toggle").should("contain", "Light");
    paintedDark().should("eq", false);

    cy.get("@toggle").click();
    cy.get("@toggle").should("contain", "Dark");
    paintedDark().should("eq", true);
    cy.getCookie("theme").its("value").should("eq", "dark");

    cy.request("/").its("body").should("match", /<html[^>]*class="dark"/);
    cy.reload();
    cy.get('button[aria-label^="Theme:"]').should("contain", "Dark");
    paintedDark().should("eq", true);
  });

  it("follows the operating system preference on System", () => {
    emulateColorScheme("dark");
    cy.visit("/");
    cy.get('button[aria-label^="Theme:"]').should("contain", "System");
    paintedDark().should("eq", true);
  });

  it("lets an explicit Light choice win over a dark OS preference", () => {
    emulateColorScheme("dark");
    cy.setCookie("theme", "light");
    cy.visit("/");
    cy.get('button[aria-label^="Theme:"]').should("contain", "Light");
    paintedDark().should("eq", false);
  });
});

export {};
