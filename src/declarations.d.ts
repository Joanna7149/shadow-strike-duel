// src/custom.d.ts
declare module "*.json" {
    const value: any; // 或者你可以定義更具體的類型，如果你的 JSON 結構是固定的
    export default value;
  }