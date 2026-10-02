import { SEEDED_LESSON_TITLE } from "../../tests/support/accounts";

const SQA = "/courses/software-quality-assurance";
const lesson = (title: string) => cy.get(`li[data-lesson="${title}"]`);

describe("Lessons", () => {
  it("lets a tutor upload, edit and reorder lessons in their course", () => {
    cy.login("tutor");
    cy.visit("/tutor");
    cy.contains("a", "Manage lessons").click();
    cy.location("pathname").should("eq", `${SQA}/manage`);

    cy.get("#lesson-title").type("Writing good bug reports");
    cy.get("#lesson-description").type("Steps, expected vs actual, evidence.");
    cy.get("#lesson-video").selectFile("tests/fixtures/sample.webm");
    cy.contains("button", "Add lesson").click();
    lesson("Writing good bug reports").should("contain", "Video ·");

    lesson("Writing good bug reports").within(() => {
      cy.contains("button", "Edit").click();
      cy.get('input[name="title"]').clear().type("Bug reports that get fixed");
      cy.get('textarea[name="description"]').clear().type("Updated description.");
      cy.contains("button", "Save lesson").click();
    });
    lesson("Bug reports that get fixed").contains("button", "Save lesson").should("not.exist");

    lesson("Bug reports that get fixed").find('button[aria-label="Move up"]').click();
    cy.get("ol > li").first().should("contain", "Bug reports that get fixed");

    cy.visit(SQA);
    cy.contains("a", "Bug reports that get fixed").click();
    cy.contains("Updated description.");
  });

  it("keeps tutors out of lessons in courses they don't teach", () => {
    cy.login("tutor");
    cy.visit("/courses/data-analytics/manage");
    cy.location("pathname").should("eq", "/courses/data-analytics");

    cy.logoutAll();
    cy.login("contentAdmin");
    cy.visit("/courses/data-analytics/manage");
    cy.get("#lesson-title").type("Pivot tables");
    cy.contains("button", "Add lesson").click();
    cy.contains("a", "Pivot tables")
      .invoke("attr", "href")
      .then((href) => {
        const lessonId = String(href).split("/").pop();
        cy.logoutAll();
        cy.login("tutor");
        cy.request({
          method: "PUT",
          url: `/api/lessons/${lessonId}/video`,
          headers: { "content-type": "video/webm" },
          body: "not really a video",
          failOnStatusCode: false,
        })
          .its("status")
          .should("eq", 403);
      });
  });

  it("keeps students out of lesson management", () => {
    cy.login("student");
    cy.visit(`${SQA}/manage`);
    cy.location("pathname").should("eq", "/student");
  });

  it("lets admins edit lessons from the admin course page", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/courses");
    cy.contains("a", "Software Quality Assurance").click();
    lesson(SEEDED_LESSON_TITLE).within(() => {
      cy.contains("button", "Edit").click();
      cy.get('input[name="title"]').clear().type("Welcome to QA");
      cy.contains("button", "Save lesson").click();
    });
    lesson("Welcome to QA").should("exist");
  });
});
