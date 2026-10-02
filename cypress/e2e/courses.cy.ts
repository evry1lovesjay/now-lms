import { accounts, COURSE_TITLES, SEEDED_LESSON_TITLE } from "../../tests/support/accounts";

describe("Courses & learning", () => {
  it("lists the four courses on the home page", () => {
    cy.visit("/");
    COURSE_TITLES.forEach((title) => cy.get("main").contains("a", title));
  });

  it("lets a content admin add, reorder and delete lessons with video upload", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/courses");
    cy.get("main").contains("a", "Data Analytics").click();

    cy.get("#lesson-title").type("SQL basics");
    cy.get("#lesson-description").type("SELECT * FROM learning");
    cy.get("#lesson-video").selectFile("tests/fixtures/sample.webm");
    cy.contains("button", "Add lesson").click();
    cy.contains("li", "SQL basics", { timeout: 15000 }).should("contain", "Video ·");

    cy.get("#lesson-title").type("Intro");
    cy.contains("button", "Add lesson").click();
    cy.contains("li", "Intro").should("contain", "No video uploaded");

    cy.contains("li", "Intro").find('button[aria-label="Move up"]').click();
    cy.get("ol > li").first().should("contain", "Intro");

    cy.contains("li", "SQL basics").contains("button", "Delete").click();
    cy.contains("li", "SQL basics").should("not.exist");
  });

  it("lets a content admin assign a tutor, who then sees the course", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/courses");
    cy.get("main").contains("a", "Product Design").click();
    cy.get("select[name=tutorId]").select(`Demo Tutor (${accounts.tutor.email})`);
    cy.contains("button", "Assign").click();
    cy.contains("li", accounts.tutor.email);

    cy.logoutAll();
    cy.login("tutor");
    cy.contains("h2", "Product Design");
  });

  it("lets a student enroll, watch and complete a lesson; the tutor sees progress", () => {
    cy.login("student");
    cy.visit("/courses/software-quality-assurance");
    cy.contains("a", SEEDED_LESSON_TITLE).should("not.exist");

    cy.enrollInSqa();
    cy.openSeededLesson();

    cy.get("video")
      .should("have.attr", "controlslist")
      .and("match", /nodownload/);
    cy.get("video").should(($v) => {
      expect(($v[0] as HTMLVideoElement).readyState).to.be.gte(1);
    });
    cy.contains(accounts.student.email); // watermark

    cy.contains("button", "Mark as complete").click();
    cy.contains("button", "✓ Completed");

    cy.visit("/student");
    cy.contains("100%");

    cy.logoutAll();
    cy.login("tutor");
    cy.contains("tr", accounts.student.email).should("contain", "100%");
  });
});
