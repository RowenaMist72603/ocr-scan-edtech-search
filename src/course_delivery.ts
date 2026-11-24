import { z } from "zod";
import { indexText, ocrDocument, searchText } from "./infrai_pipeline.ts";

export const deliveryRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  deadline: z.string().date(),
  pdf: z.string().min(1),
  question: z.string().min(1)
});

export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export function deadlineState(deadline: string, today: string): "open" | "due" {
  return deadline <= today ? "due" : "open";
}

export async function deliverLesson(input: unknown) {
  const request = deliveryRequest.parse(input);
  const ocr = await ocrDocument(request.pdf);
  await indexText(process.env.INFRAI_VECTOR_COLLECTION ?? "course-materials", request.courseId, ocr.text);
  const matches = await searchText(process.env.INFRAI_VECTOR_COLLECTION ?? "course-materials", request.question, 5);
  return {
    courseId: request.courseId,
    learnerId: request.learnerId,
    deadline: request.deadline,
    status: deadlineState(request.deadline, new Date().toISOString().slice(0, 10)),
    matches
  };
}

if (import.meta.main) {
  const raw = process.env.DELIVERY_REQUEST;
  if (!raw) throw new Error("Set DELIVERY_REQUEST to a JSON request body");
  deliverLesson(JSON.parse(raw)).then((result) => console.log(JSON.stringify(result, null, 2)));
}
