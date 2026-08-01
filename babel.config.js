import * as t from "@babel/types";

const transformarImportMetaEnvParaJest = () => ({
  visitor: {
    MemberExpression(path) {
      const { node } = path;
      const env = node.object;
      if (
        env?.type === "MemberExpression" &&
        env.object?.type === "MetaProperty" &&
        env.object.meta.name === "import" &&
        env.object.property.name === "meta" &&
        env.property.type === "Identifier" &&
        env.property.name === "env"
      ) {
        path.replaceWith(
          t.memberExpression(
            t.memberExpression(t.identifier("process"), t.identifier("env")),
            node.property,
            node.computed,
          ),
        );
      }
    },
  },
});

export default (api) => ({
  presets: ["@babel/preset-env", "@babel/preset-react"],
  plugins: api.env("test") ? [transformarImportMetaEnvParaJest] : [],
});
