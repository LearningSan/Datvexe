

export function successResponse(
    data: unknown = null,
    message = "Success",
    status = 200
) {

    return Response.json(
        {
            success: true,
            message,
            data,
        },
        {
            status,
        }
    );
}
export function errorResponse(
    message = "Internal Server Error",
    errors: unknown = null,
    status = 500
) {

    return Response.json(
        {
            success: false,
            message,
            errors,
        },
        {
            status,
        }
    );
}


export function badRequestResponse(
    message = "Bad Request",
    errors: unknown = null
) {

    return errorResponse(
        message,
        errors,
        400
    );
}
export function unauthorizedResponse(
    message = "Unauthorized"
) {

    return errorResponse(
        message,
        null,
        401
    );
}

export function forbiddenResponse(
    message = "Forbidden"
) {

    return errorResponse(
        message,
        null,
        403
    );
}


export function notFoundResponse(
    message = "Resource not found"
) {

    return errorResponse(
        message,
        null,
        404
    );
}


export function conflictResponse(
    message = "Conflict"
) {

    return errorResponse(
        message,
        null,
        409
    );
}


export function unprocessableEntityResponse(
    message = "Unprocessable Entity",
    errors: unknown = null
) {

    return errorResponse(
        message,
        errors,
        422
    );
}

/**
 * 429
 * spam request
 */
export function tooManyRequestsResponse(
    message = "Too many requests"
) {

    return errorResponse(
        message,
        null,
        429
    );
}

export function internalServerErrorResponse(
    message = "Internal Server Error"
) {

    return errorResponse(
        message,
        null,
        500
    );
}


export function handleMySQLError(
    error: any
) {

    console.error(
        "MYSQL_ERROR",
        error
    );

    if (
        error?.code ===
        "ER_DUP_ENTRY"
    ) {

        return conflictResponse(
            "Data already exists"
        );
    }

    if (
        error?.code ===
        "ER_NO_REFERENCED_ROW_2"
    ) {

        return badRequestResponse(
            "Referenced data does not exist"
        );
    }

    if (
        error?.code ===
        "ER_ROW_IS_REFERENCED_2"
    ) {

        return conflictResponse(
            "Data is being used"
        );
    }

    if (
        error?.code ===
        "ER_DATA_TOO_LONG"
    ) {

        return badRequestResponse(
            "Data too long"
        );
    }

    // unknown column
    if (
        error?.code ===
        "ER_BAD_FIELD_ERROR"
    ) {

        return internalServerErrorResponse(
            "Invalid database field"
        );
    }

    if (
        error?.code ===
        "ER_NO_SUCH_TABLE"
    ) {

        return internalServerErrorResponse(
            "Database table not found"
        );
    }

    return internalServerErrorResponse(
        "Database error"
    );
}



export function invalidCredentialsResponse() {

    return unauthorizedResponse(
        "Invalid email or password"
    );
}

export function tokenExpiredResponse() {

    return unauthorizedResponse(
        "Token expired"
    );
}

export function invalidTokenResponse() {

    return unauthorizedResponse(
        "Invalid token"
    );
}

export function sessionExpiredResponse() {

    return unauthorizedResponse(
        "Session expired"
    );
}


export function seatAlreadyBookedResponse() {

    return conflictResponse(
        "Seat already booked"
    );
}

export function seatAlreadyHeldResponse() {

    return conflictResponse(
        "Seat is being held"
    );
}

export function tripNotFoundResponse() {

    return notFoundResponse(
        "Trip not found"
    );
}

export function bookingNotFoundResponse() {

    return notFoundResponse(
        "Booking not found"
    );
}

export function tripClosedResponse() {

    return conflictResponse(
        "Trip is closed"
    );
}

export function tripFullResponse() {

    return conflictResponse(
        "Trip is full"
    );
}

export function invalidSeatResponse() {

    return badRequestResponse(
        "Invalid seat"
    );
}

export function seatHoldExpiredResponse() {

    return conflictResponse(
        "Seat hold expired"
    );
}



export function paymentFailedResponse() {

    return conflictResponse(
        "Payment failed"
    );
}

export function paymentNotFoundResponse() {

    return notFoundResponse(
        "Payment not found"
    );
}



export function userNotFoundResponse() {

    return notFoundResponse(
        "User not found"
    );
}

export function emailAlreadyExistsResponse() {

    return conflictResponse(
        "Email already exists"
    );
}

export function phoneAlreadyExistsResponse() {

    return conflictResponse(
        "Phone already exists"
    );
}

export function accountBlockedResponse() {

    return forbiddenResponse(
        "Account has been blocked"
    );
}