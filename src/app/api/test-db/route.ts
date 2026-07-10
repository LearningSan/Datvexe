import { NextResponse } from "next/server";

import pool from "@/db/db";

export async function GET() {

    try {

        const connection = await pool.getConnection();

        await connection.ping();

        connection.release();

        return NextResponse.json({
            success: true,
            message: "Database connected successfully",
            data: null
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message: "Database connection failed",
                errors: null
            },
            {
                status: 500
            }
        );
    }
}