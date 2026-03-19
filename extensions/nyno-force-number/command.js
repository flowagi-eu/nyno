export function nyno_force_number(args, context) {
  const setName = context?.set_context ?? "prev";

  // Check if args[0] exists
  if (args.length === 0 || args[0] === undefined || args[0] === null) {
    context[setName + "_error"] = {
      errorMessage: "No argument provided. Expected a number.",
      errorCode: "MISSING_ARGUMENT"
    };
    return -1;
  }

  // Convert to number (handles both string numbers and actual numbers)
  const num = Number(args[0]);

  // Check if conversion resulted in NaN
  if (Number.isNaN(num)) {
    context[setName + "_error"] = {
      errorMessage: `Argument '${args[0]}' is not a valid number.`,
      errorCode: "INVALID_NUMBER"
    };
    return -1;
  }

  // Store the validated number in context
  context[setName] = num;
  return 0;
}

