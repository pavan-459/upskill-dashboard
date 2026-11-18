import { describe, expect, it } from "vitest";
import { learningPath } from "./path";
import { course, enrollment, seedCatalog } from "./test-helpers";
import { catalogFrom } from "./types";

const aisha = [enrollment("c1", 12), enrollment("c2", 10), enrollment("c3", 4)];

describe("learningPath", () => {
  it("lays out a track in prerequisite order with node states", () => {
    const [track] = learningPath(seedCatalog, aisha, ["react", "frontend"]);
    expect(track.nodes.map((n) => [n.courseId, n.state, n.depth])).toEqual([
      ["c1", "finished", 0],
      ["c2", "earned", 1],
      ["c3", "in-progress", 2],
    ]);
  });

  it("only includes tracks relevant to the learner (not a catalog)", () => {
    expect(learningPath(seedCatalog, aisha, ["react"]).map((t) => t.id)).toEqual(["c1"]);
    // Adding a recommendation pulls in its track.
    expect(learningPath(seedCatalog, aisha, ["react"], ["c4"]).map((t) => t.id)).toEqual(["c1", "c4"]);
    // Goal skills pull in the tracks that teach them.
    expect(learningPath(seedCatalog, [], ["user-research"]).map((t) => t.id)).toEqual(["c6"]);
  });

  it("marks available vs locked with the why-locked hint", () => {
    const [track] = learningPath(seedCatalog, [], [], ["c4"]);
    expect(track.nodes.map((n) => [n.courseId, n.state, n.hint])).toEqual([
      ["c4", "available", null],
      ["c5", "locked", "Enroll in and finish SQL Fundamentals first"],
    ]);
  });

  it("flags courses that teach a goal", () => {
    const [track] = learningPath(seedCatalog, aisha, ["react"]);
    expect(track.nodes.filter((n) => n.teachesGoal).map((n) => n.courseId)).toEqual(["c3"]);
  });

  it("uses the longest prerequisite chain for depth", () => {
    const catalog = catalogFrom([
      course("a"),
      course("b", { prerequisites: ["a"] }),
      course("c", { prerequisites: ["a", "b"] }),
    ]);
    expect(learningPath(catalog, [], [], ["a"])[0].nodes.map((n) => [n.courseId, n.depth])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("returns no tracks when nothing is relevant", () => {
    expect(learningPath(seedCatalog, [], [])).toEqual([]);
  });
});
