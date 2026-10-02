const SECTION_KEYS = ["OUTLINE", "MATERIALS", "RESOURCES"];

describe("Course creation", () => {
  it("lets a content admin create a course with the same fixed sections as every course", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/courses");
    cy.contains("a", "+ New course").click();

    cy.get("#course-title").type("Cloud Engineering");
    cy.get("#course-summary").type("Deploy and run apps on the cloud.");
    cy.get("#course-description").type("AWS, containers and infrastructure as code.");
    cy.contains("button", "Create course").click();

    cy.location("pathname").should("match", /^\/admin\/courses\/(?!new$)[^/]+$/);
    cy.contains("h2", "Cloud Engineering");

    cy.visit("/");
    cy.contains("a", "Cloud Engineering");

    ["cloud-engineering", "data-analytics"].forEach((slug) => {
      cy.visit(`/courses/${slug}`);
      cy.get("[data-section]").then(($s) => {
        expect([...$s].map((el) => el.getAttribute("data-section"))).to.deep.equal(SECTION_KEYS);
      });
    });
  });

  it("gives duplicate course titles a unique address", () => {
    cy.login("superadmin");
    [1, 2].forEach(() => {
      cy.visit("/admin/courses/new");
      cy.get("#course-title").type("Cyber Security");
      cy.get("#course-summary").type("Protect systems and data.");
      cy.get("#course-description").type("Threats, defence and incident response.");
      cy.contains("button", "Create course").click();
      cy.location("pathname").should("match", /^\/admin\/courses\/(?!new$)[^/]+$/);
    });
    cy.visit("/courses/cyber-security");
    cy.contains("h1", "Cyber Security");
    cy.visit("/courses/cyber-security-2");
    cy.contains("h1", "Cyber Security");
  });

  it("keeps tutors and students out of course creation", () => {
    cy.login("tutor");
    cy.visit("/admin/courses/new");
    cy.location("pathname").should("eq", "/tutor");

    cy.logoutAll();
    cy.login("student");
    cy.visit("/admin/courses/new");
    cy.location("pathname").should("eq", "/student");
  });
});

export {};
