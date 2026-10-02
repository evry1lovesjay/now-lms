const current = () => cy.get('nav[aria-label="Main"] [aria-current="page"]');
const navLabels = () =>
  cy.get('nav[aria-label="Main"] li').then(($li) => [...$li].map((li) => li.textContent?.trim()));

describe("Navbar", () => {
  it("puts Dashboard before Courses and highlights the current page", () => {
    cy.login("student");
    navLabels().should("deep.equal", ["Dashboard", "Courses", "Assignments"]);
    current().should("have.text", "Dashboard");

    cy.visit("/courses/software-quality-assurance");
    current().should("have.text", "Courses");

    // The most specific link wins: /student/assignments highlights Assignments, not Dashboard.
    cy.visit("/student/assignments");
    current().should("have.text", "Assignments");

    current().then(($active) => {
      cy.get('nav[aria-label="Main"] a:not([aria-current])')
        .contains("Courses")
        .then(($other) => {
          expect(getComputedStyle($active[0]).backgroundColor).not.to.eq(getComputedStyle($other[0]).backgroundColor);
        });
    });
  });

  it("shows Dashboard, Courses and Users to admins", () => {
    cy.login("superadmin");
    navLabels().should("deep.equal", ["Dashboard", "Courses", "Users"]);
    cy.visit("/admin/users");
    current().should("have.text", "Users");
  });

  it("shows the first name above a smaller role", () => {
    cy.login("tutor"); // "Demo Tutor"
    cy.get('[data-testid="nav-user"] span').then(($spans) => {
      const [name, role] = [$spans[0], $spans[1]];
      expect(name.textContent).to.eq("Demo");
      expect(role.textContent).to.match(/tutor/i);
      expect(role.getBoundingClientRect().top).to.be.greaterThan(name.getBoundingClientRect().bottom - 2);
      expect(parseFloat(getComputedStyle(role).fontSize)).to.be.lessThan(parseFloat(getComputedStyle(name).fontSize));
    });
  });

  it("sets the role in a very small font", () => {
    cy.login("student");
    cy.get('[data-testid="nav-user"] span')
      .eq(1)
      .then(($role) => expect(parseFloat(getComputedStyle($role[0]).fontSize)).to.be.at.most(10));
  });

  it("keeps the theme choice and Log out in the user menu", () => {
    cy.login("student");
    cy.contains("button", "Log out").should("not.exist");
    cy.get('button[aria-label^="Account menu for Demo"]').as("trigger").should("have.attr", "aria-expanded", "false");
    cy.get("@trigger").click();
    cy.get("@trigger").should("have.attr", "aria-expanded", "true");
    cy.get('[data-testid="user-menu"] [role="radio"]').then(($r) => {
      expect([...$r].map((r) => r.textContent?.trim())).to.deep.equal(["🖥️ System", "☀️ Light", "🌙 Dark"]);
    });

    cy.get('[data-testid="user-menu"]').contains('[role="radio"]', "Dark").click();
    cy.get('[data-testid="user-menu"]').contains('[role="radio"]', "Dark").should("have.attr", "aria-checked", "true");
    cy.get("html").should("have.class", "dark");
    cy.getCookie("theme").its("value").should("eq", "dark");

    cy.get("body").type("{esc}");
    cy.get('[data-testid="user-menu"]').should("not.exist");
    cy.get("@trigger").click();
    cy.get("h1").first().click();
    cy.get('[data-testid="user-menu"]').should("not.exist");

    cy.get("@trigger").click();
    cy.get('[data-testid="user-menu"]').contains("button", "Log out").click();
    cy.location("pathname").should("eq", "/login");
  });

  it("uses a hamburger menu on small screens", () => {
    cy.viewport(390, 844);
    cy.login("student");
    cy.get('button[aria-label^="Account menu"]').should("not.be.visible");
    cy.get('button[aria-label="Open menu"]').should("be.visible").click();
    cy.get('button[aria-label="Close menu"]').should("have.attr", "aria-expanded", "true");
    cy.get('[data-testid="mobile-menu"] li').then(($li) => {
      expect([...$li].map((li) => li.textContent?.trim())).to.deep.equal(["Dashboard", "Courses", "Assignments"]);
    });
    cy.get('[data-testid="mobile-menu"] [aria-current="page"]').should("have.text", "Dashboard");
    cy.get('[data-testid="mobile-menu"]').should("contain", "Demo").find('[role="radio"]').should("have.length", 3);

    cy.get('[data-testid="mobile-menu"]').contains("a", "Courses").click();
    cy.location("pathname").should("eq", "/courses");
    cy.get('[data-testid="mobile-menu"]').should("not.exist");

    cy.get('button[aria-label="Open menu"]').click();
    cy.get('[data-testid="mobile-menu"] [aria-current="page"]').should("have.text", "Courses");
    cy.get('[data-testid="mobile-menu"]').contains("button", "Log out").click();
    cy.location("pathname").should("eq", "/login");
  });

  it("shows signed-out visitors Courses, Log in and Sign up on small screens", () => {
    cy.viewport(390, 844);
    cy.visit("/");
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('[data-testid="mobile-menu"] li').then(($li) => {
      expect([...$li].map((li) => li.textContent?.trim())).to.deep.equal(["Courses", "Log in"]);
    });
    cy.get('[data-testid="mobile-menu"]').contains("a", "Sign up");
    cy.get("body").type("{esc}");
    cy.get('[data-testid="mobile-menu"]').should("not.exist");
  });
});

export {};
