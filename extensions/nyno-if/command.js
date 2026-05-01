function hasQuotedPair(input) {
    return /(["'])(.*?)\1.+?(["'])(.*?)\3/.test(input);
}

function parseQuotedPair(input) {
    const m = input.match(/(["'])(.*?)\1.+?(["'])(.*?)\3/);
    if (m) {
        return [m[2], m[4]];
    }
    return null;
}

function parseNumberPair(input) {
    const m = input.match(/(-?\d+(?:\.\d+)?).+?(-?\d+(?:\.\d+)?)/);
    if (m) {
        return [parseFloat(m[1]), parseFloat(m[2])];
    }
    return null;
}

function evaluateCondition(input, left, right) {
    if (input.includes("contains")) {
        return String(left).includes(String(right));
    }

    if (input.includes("not starts with")) {
        return !String(left).startsWith(String(right));
    }

    if (input.includes("starts with")) {
        return String(left).startsWith(String(right));
    }

    if (input.includes("lower than") || input.includes("less than")) {
        return left < right;
    }

    if (input.includes("higher than") || input.includes("greater than")) {
        return left > right;
    }

    if (
        input.includes("not equal") ||
        input.includes("not equal to") ||
        input.includes("is not")
    ) {
        return left != right;
    } else if (
        input.includes("equal to") ||
        input.includes("equals") ||
        input.includes("is")
    ) {
        return left == right;
    }

    return null;
}

export function nyno_if(args, context) {
    const setName = context?.set_context || "prev";

    if (!args || args.length < 1) {
        context[`${setName}.usage`] =
            'Usage: if_eval "10 is lower than 5"\n';
        return -1;
    }

    let left = args[0];
    const input = String(args[1]).toLowerCase();
    let right = args[2];

    if (!isNaN(left)) {
        left = Number(left);
    }
    if (!isNaN(right)) {
        right = Number(right);
    }

    context[`${setName}.left`] = left;
    context[`${setName}.right`] = right;

    const result = evaluateCondition(input, left, right);

    if (result === null) {
        context[`${setName}.error`] = "Unknown condition in input";
        return -1;
    }

    context[setName] = result ? 0 : 1; // because its a status code, 0 is good/true/default here (first path) and 1 status would mean false (second path)
    return context[setName];
}
