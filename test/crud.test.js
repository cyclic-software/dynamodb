const db = require("../src");

process.env.CYCLIC_DB = process.env.CYCLIC_DB || "db-sdkCyclicDB";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-2";

function createKey() {
  return Math.random().toString(36).slice(2);
}

describe("CRUD Suite from example in README", () => {
  test("CRUD", async () => {
    let animals = db.collection("animals");
    let key = createKey();

    // create an item in collection with key "leo"
    let leo = await animals.set(key, {
      type: "cat",
      name: "leo",
      color: "orange",
    });

    console.log(leo);

    // get an item at key "leo" from collection animals
    let item = await animals.get(key);

    console.log(item);

    // expect(item.props).toContain(leo.props)

    expect(item.props).toEqual(expect.objectContaining(leo.props));
  });

  test("find index item", async () => {
    let animals = db.collection("animals");
    let key = createKey();
    let leo = await animals.set(
      key,
      {
        type: "cat",
        name: "leo",
        color: "orange",
      },
      {
        $index: ["name"],
      }
    );

    let r = await animals.index("name").find("leo");
    await leo.delete();
    expect(r.results.length).toEqual(1);
    expect(r.results[0].key).toEqual(key);
  });

  test("delete fragment", async () => {
    let animals = db.collection("animals");
    let leo_fragment = await animals
      .item("leo")
      .fragment("fr", "frname")
      .set(
        {
          data: "fragment",
        },
        {
          $index: ["data"],
        }
      );

    console.log(leo_fragment);
    let r = await animals.index("data").find("fragment");
    console.log(r.results[0]);
    expect(r.results.length).toEqual(1);
    expect(r.results[0].key).toEqual("frname");

    await leo_fragment.delete();
    r = await animals.index("data").find("fragment");
    console.log(r);
    expect(r.results.length).toEqual(0);
    // console.log(leo_fragment)
  });
});
