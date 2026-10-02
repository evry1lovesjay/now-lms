const SQA = "/courses/software-quality-assurance";
const PDF = "tests/fixtures/sample.pdf";

const section = (key: string) => cy.get(`[data-section="${key}"]`);

describe("Course outline, materials & resources", () => {
  it("offers exactly the three sections, and resources only take links", () => {
    cy.login("tutor");
    cy.visit(SQA);
    cy.get("#content-section option:not([disabled])").then(($o) => {
      expect([...$o].map((o) => o.textContent)).to.deep.equal(["📋 Course outline", "📚 Course materials", "🔗 Resources"]);
    });
    cy.get("#content-section").select("RESOURCES");
    cy.contains("label", "Upload a file").should("not.exist");
    cy.get("#content-section").select("OUTLINE");
    cy.contains("label", "Upload a file").should("exist");
  });

  it("lets the assigned tutor post; learners see colour-coded sections above the lessons", () => {
    cy.login("tutor");
    cy.visit(SQA);
    cy.postContent("OUTLINE", { title: "SQA syllabus", file: PDF });
    cy.postContent("MATERIALS", { title: "Testing handbook", url: "https://example.com/handbook" });
    cy.postContent("RESOURCES", { title: "Live class — Mondays", url: "https://meet.google.com/abc-defg-hij" });
    cy.postContent("RESOURCES", { title: "Recorded session 1", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    section("RESOURCES").should("contain", "Live class").and("contain", "Video");

    cy.get('[data-testid="course-sections"]').then(($sections) => {
      cy.contains("h2", /^Lessons/).then(($lessons) => {
        expect($sections[0].getBoundingClientRect().top).to.be.lessThan($lessons[0].getBoundingClientRect().top);
      });
    });

    cy.logoutAll();
    cy.login("student");
    cy.visit(SQA);
    section("OUTLINE").should("contain", "SQA syllabus");
    section("MATERIALS").should("contain", "Enroll to see");
    section("RESOURCES").should("not.contain", "Live class — Mondays");

    cy.enrollInSqa();
    section("MATERIALS").should("contain", "Testing handbook");
    section("RESOURCES")
      .contains("a", "Live class — Mondays")
      .should("have.attr", "href", "https://meet.google.com/abc-defg-hij")
      .and("have.attr", "target", "_blank");
    cy.get('[data-testid="content-composer"]').should("not.exist");
  });

  it("serves outline files publicly but keeps material files behind course access", () => {
    cy.login("contentAdmin");
    cy.visit(SQA);
    cy.postContent("OUTLINE", { title: "Outline PDF", file: PDF });
    cy.postContent("MATERIALS", { title: "Chapter 1 PDF", file: PDF });

    section("OUTLINE").contains("a", "Outline PDF").invoke("attr", "href").as("outline");
    section("MATERIALS").contains("a", "Chapter 1 PDF").invoke("attr", "href").as("material");
    cy.clearAllCookies();
    cy.get<string>("@outline").then((href) => {
      cy.request(href).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.headers["content-type"]).to.eq("application/pdf");
      });
    });
    cy.get<string>("@material").then((href) => {
      cy.request({ url: href, failOnStatusCode: false }).its("status").should("eq", 401);
    });
  });

  it("only lets tutors post to their own courses and rejects unsafe links", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/courses");
    cy.contains("a", "Data Analytics")
      .invoke("attr", "href")
      .then((href) => {
        const courseId = String(href).split("/").pop();
        const post = (title: string, url: string) =>
          cy.request({
            method: "POST",
            url: `/api/courses/${courseId}/content`,
            form: true,
            body: { section: "RESOURCES", kind: "LINK", title, url },
            failOnStatusCode: false,
          });

        post("Bad link", "javascript:alert(1)").its("status").should("eq", 400);

        cy.logoutAll();
        cy.login("tutor");
        cy.visit("/courses/data-analytics");
        cy.get('[data-testid="content-composer"]').should("not.exist");
        post("Sneaky", "https://example.com").its("status").should("eq", 403);
      });
  });

  it("lets staff remove a posted item", () => {
    cy.login("contentAdmin");
    cy.visit(SQA);
    cy.postContent("RESOURCES", { title: "Old link", url: "https://example.com/old" });
    section("RESOURCES").contains("li", "Old link").contains("button", "Remove").click();
    section("RESOURCES").should("contain", "Nothing posted yet.");
  });
});

export {};
