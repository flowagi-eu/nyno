
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

    if (input.includes("at least")) {
        return left >= right;
    }

    if (input.includes("at most")) {
        return left <= right;
    }

    if (input.includes("greater than")) {
        return left > right;
    }

    if (input.includes("less than")) {
        return left < right;
    }

    if (input.includes("is not")) {
        return left != right;
    }

    if (input.includes("is")) {
        return left == right;
    }

    return null;
}

export function _if(args, context) {
    const setName = context?.set || "prev";

    if (!args || args.length < 1) {
        context[`${setName}.usage`] =
            'Usage: if_eval "10 is less than 5"\n';
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

    const newContext = {};
    newContext[`${setName}.left`] = left;
    newContext[`${setName}.right`] = right;

    const result = evaluateCondition(input, left, right);

    if (result === null) {
        newContext[`${setName}.error`] = "Unknown condition in input";
        return [-1, newContext];
    }

    newContext[setName] = result ? 0 : 1;

    return [newContext[setName], newContext];
}

