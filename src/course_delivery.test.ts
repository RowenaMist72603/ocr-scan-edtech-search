import assert from "node:assert/strict";
import { deadlineState, deliveryRequest } from "./course_delivery.ts";

assert.equal(deadlineState("2026-10-23", "2026-10-24"), "due");
assert.equal(deadlineState("2026-10-25", "2026-10-24"), "open");
assert.equal(deliveryRequest.parse({ courseId: "algebra", learnerId: "lee", deadline: "2026-10-25", pdf: "base64-pdf", question: "What is factoring?" }).courseId, "algebra");
console.log("course delivery decisions pass");
