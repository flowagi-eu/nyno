import {
  Model,
  List,
  Any,
} from "../shared-libs/modeljs/index.js";

// handlers
import { flows } from "./handlers/flows.js";
import { polling } from "./handlers/polling.js";

// reusable models
const Step = Model.schema(
  {
    id: Number,
    next: List(Number),
    step: String,
    args: List(Any),
    context: Object,
  },
  {
    shapeOptional: [
      "args",
      "context",
      "id",
      "next"
    ],
  }
);


// routes registry

export default [
  {
    method: "POST",
    path: "/flows",
    auth: true,

    body: Model.schema({
      workflow: List(Step),
      context: Object,
    },{
      shapeOptional: ['context']
    }),

    handler: flows,
    docs: "/flows",
  },
  {
    method: "GET",
    path: "/polling/:taskId",
    auth: true,

    params: Model.schema({
      taskId: String,
    }),

    handler: polling,
    docs: "/flows-async",
  },
];