// tests/unit-tests/multi.test.js
import { describe, it, expect } from "bun:test";
import { runYamlTool } from "../../src/tcp/multi.js";


describe("runYamlTool YAML parsing", () => {
  it("should parse new Nyno 2.1 > YAML syntax", async () => {
    const node = {
      id: "1",
      func: "test_node",
      info: `
        - step: echo
          args:
            - "hello"
            - "\${NAME}"
          context:
            NAME: "World"
      `
    };

    const context = {};
    const result = await runYamlTool(node, context);

	  console.log('result',result);
    // Check context is updated correctly
    expect(result.output.c).toBeDefined();
    expect(result.output.c.NAME).toBe("World");

    // Check command was parsed correctly
    expect(result.command[0]).toBe("echo");
    expect(result.command).toContain("hello");
    expect(result.command).toContain("World");
  });

  it("should return early if YAML is empty", async () => {
    const node = { id: "2", info: "" };
    const result = await runYamlTool(node);
    expect(result.output.r).toBe("");
  });
});

