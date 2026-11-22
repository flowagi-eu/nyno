export const Any = Symbol("Any");
const creationToken = Symbol("Model");

export const List = type => ({ list: type });

export class Model {
  static shape = {};
  static shapeFns = {};
  static shapeOptional = [];

static create(props) {
  const cleaned = this.validate(props, this.shape);
  return new this(cleaned, creationToken);
}


  // also support inline usage (no need to define new class)
  static schema(shape, options = {}) {
    return class extends Model {
      static shape = shape;
      static shapeOptional = options.shapeOptional ?? [];
      static shapeFns = options.shapeFns ?? [];
    };
  }

  constructor(props, token) {
    if (token !== creationToken) {
      throw new TypeError(
        `${this.constructor.name} must be created using .create()`
      );
    }

    Object.assign(this, props);
  }

static validate(data, definition) {
  if (data?.constructor !== Object)
    throw new TypeError("Expected an object");

  const result = {};

  for (const [key, type] of Object.entries(definition)) {
    if (!(key in data)) {
      if (this.shapeOptional.includes(key))
        continue;

      throw new TypeError(`Missing field: ${key}`);
    }

    if (!this.check(data[key], type))
      throw new TypeError(`Invalid type: ${key}`);

    result[key] = data[key];
  }

  this.validateFns(data);

  return result;
}


  static validateFns(data) {
    for (const [key, fn] of Object.entries(this.shapeFns)) {
      if (!(key in data))
        continue;

      const result = fn(data[key], data);

      if (!Array.isArray(result) || result[0] !== 0) {
        const message =
          Array.isArray(result) && result[1]
            ? result[1]
            : `Invalid value: ${key}`;

        throw new TypeError(message);
      }
    }
  }

static check(value, type) {
  if (type === Any)
    return true;

  if (type?.list) {
    return Array.isArray(value) &&
      value.every(item => this.check(item, type.list));
  }

  if (type && typeof type === "object") {
    return value?.constructor === Object &&
      this.validate(value, type);
  }

  if (type === String)
    return typeof value === "string";

  if (type === Number)
    return typeof value === "number" && !Number.isNaN(value);

  if (type === Boolean)
    return typeof value === "boolean";

  if (type === Object)
    return value?.constructor === Object;

  if (type === Array)
    return Array.isArray(value);

  // Model.schema() classes
  if (
    typeof type === "function" &&
    type.prototype instanceof Model
  ) {
    return value?.constructor === Object &&
      type.validate(value, type.shape);
  }

  return typeof type === "function" && value instanceof type;
}

}


