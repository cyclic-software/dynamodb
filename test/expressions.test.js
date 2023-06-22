import { paths, path_get, gen_expression } from "../src/expressions";

describe("Expressions utility | paths", () => {
  test("determines paths from nested object", async () => {
    let cat_query = {
      type: "cat",
      color: "orange",
      address: {
        city: "Philadelphia",
        state: "PA",
      },
      lives: 9,
    };

    let p = paths(cat_query);
    expect(p).toEqual([
      ["type"],
      ["color"],
      ["address", "city"],
      ["address", "state"],
      ["lives"],
    ]);
  });

  test("does not fail on blank object", async () => {
    let cat_query = {};
    let p = paths(cat_query);
    expect(p).toEqual([[]]);
  });

  test("fails on array query values", async () => {
    let cat_query = {
      type: "cat",
      color: ["orange"],
    };
    let error;
    try {
      let p = paths(cat_query);
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual(
      'Array values are not supported in queries. Received: ["orange"]'
    );
  });
});

describe("Expressions utility | paths_get", () => {
  test("gets value at a path", async () => {
    let cat_obj = {
      type: "cat",
      color: "orange",
      address: {
        city: "Philadelphia",
        state: "PA",
      },
      lives: 9,
    };
    let lives = path_get(cat_obj, ["lives"]);
    expect(lives).toEqual(9);
  });

  test("gets value at a long path", async () => {
    let cat_obj = {
      type: "cat",
      color: "orange",
      address: {
        city: "Philadelphia",
        state: "PA",
      },
      lives: 9,
    };
    let state = path_get(cat_obj, ["address", "state"]);
    expect(state).toEqual("PA");
  });

  test("gets undefined value if path does not exist", async () => {
    let cat_obj = {
      type: "cat",
      color: "orange",
      address: {
        city: "Philadelphia",
        state: "PA",
      },
      lives: 9,
    };
    let lives = path_get(cat_obj, ["liddves"]);
    expect(lives).toEqual(undefined);
  });
});

describe("Expressions utility | gen_expression", () => {
  test("generates a dynamodb scan filter expression from object", async () => {
    let cat_obj = {
      type: "cat",
      color: "orange",
      address: {
        city: "Philadelphia",
        state: "PA",
      },
      lives: 9,
    };
    let exp = gen_expression(cat_obj);

    expect(exp).toEqual({
      attr_names: {
        "#k0type": "type",
        "#k1color": "color",
        "#k2address": "address",
        "#k3city": "city",
        "#k4state": "state",
        "#k5lives": "lives",
      },
      attr_vals: {
        ":v0": "cat",
        ":v1": "orange",
        ":v2": "Philadelphia",
        ":v3": "PA",
        ":v4": 9,
        ":vvfragment": "fragment",
        ":vvitem": "item",
      },
      expression:
        "#k0type = :v0 AND #k1color = :v1 AND #k2address.#k3city = :v2 AND #k2address.#k4state = :v3 AND #k5lives = :v4 AND (cy_meta.rt = :vvitem OR cy_meta.rt = :vvfragment)",
    });
  });

  test("generates a dynamodb scan filter expression from blank object", async () => {
    let exp = gen_expression({});
    expect(exp).toEqual({
      attr_names: {},
      attr_vals: {
        ":vvfragment": "fragment",
        ":vvitem": "item",
      },
      expression: "(cy_meta.rt = :vvitem OR cy_meta.rt = :vvfragment)",
    });
  });
});
