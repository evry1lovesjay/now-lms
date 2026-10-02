const footerNav = () => cy.get('footer nav[aria-label="Footer"]');

describe("Footer", () => {
  it("links to courses, account pages and company pages", () => {
    cy.visit("/");
    ["Software Quality Assurance", "Data Analytics", "Product Management", "Product Design"].forEach((title) =>
      footerNav().contains("a", title).should("be.visible"),
    );
    footerNav().contains("a", "View all courses").should("have.attr", "href", "/courses");
    footerNav().contains("a", "Log in").should("have.attr", "href", "/login");
    footerNav().contains("a", "Register").should("have.attr", "href", "/register");
    cy.get("footer").contains("a", "support@nowlms.local").should("have.attr", "href", "mailto:support@nowlms.local");

    [
      ["About us", "About NowLMS"],
      ["Contact & support", "Contact & support"],
      ["Privacy policy", "Privacy policy"],
      ["Terms of use", "Terms of use"],
    ].forEach(([label, heading]) => {
      footerNav().contains("a", label).click();
      cy.contains("h1", heading).should("be.visible");
    });
  });

  it("gives signed-in users dashboard links instead of log in", () => {
    cy.login("student");
    footerNav().contains("a", "My dashboard").should("have.attr", "href", "/student");
    footerNav().contains("a", "My assignments").should("have.attr", "href", "/student/assignments");
    footerNav().contains("a", "Log in").should("not.exist");
  });

  it("shows the current year, never a hard-coded one", () => {
    const year = String(new Date().getFullYear());
    cy.request("/courses").its("body").should("match", new RegExp(`data-testid="current-year"[^>]*>${year}<`));
    cy.visit("/courses");
    cy.get('[data-testid="current-year"]').should("have.text", year);
    cy.get("footer").should("contain.text", `© ${year} NowLMS. All rights reserved.`);
  });

  it("rolls the year over by itself when a new year starts", () => {
    const future = new Date().getFullYear() + 5;
    // Only fake Date, so timers keep working.
    cy.clock(new Date(future, 0, 1, 0, 0, 5).getTime(), ["Date"]);
    cy.visit("/");
    cy.get('[data-testid="current-year"]').should("have.text", String(future));
  });
});
