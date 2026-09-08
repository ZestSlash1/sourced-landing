import { describe, it, expect } from "vitest";
import { PipelineField } from "@/components/hero/pipeline-field";

describe("PipelineField Component", () => {
  it("exports PipelineField as a valid React component", () => {
    expect(typeof PipelineField).toBe("function");
  });
});
