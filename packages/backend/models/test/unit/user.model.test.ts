/**
 * Schema-level unit tests for the User model.
 *
 * Mongoose runs all of this validation client-side (no MongoDB needed), which
 * makes it the cheapest place to lock down the user contract: required fields,
 * defaults, the case-insensitive email, and the bcrypt password helpers.
 *
 * Run with: npm run test:unit
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import bcrypt from "bcrypt"
import User, { UserType } from "../../src/user.model.js"

const validUser = {
    name: "  Ada Lovelace  ",
    email: "  Ada@Example.COM  ",
    password: "s3cret-password",
}

/** Runs schema validation and returns the ValidationError, if any. */
const validationError = async (doc: { validate(): Promise<void> }) => {
    try {
        await doc.validate()
        return undefined
    } catch (error) {
        return error as Error & { errors: Record<string, unknown> }
    }
}

describe("User schema", () => {
    it("requires name, email and password", async () => {
        const error = await validationError(new User({}))

        assert.ok(error, "an empty user must not validate")
        assert.deepEqual(Object.keys(error.errors).sort(), [
            "email",
            "name",
            "password",
        ])
    })

    it("applies the documented defaults", () => {
        const user = new User(validUser)

        assert.equal(user.profilePicUrl, "/default-url")
        assert.equal(user.userType, UserType.Regular)
        assert.equal(user.roleExpiry, null)
        assert.equal(user.email, "ada@example.com")
        assert.equal(user.name, "Ada Lovelace")
    })

    it("rejects a password shorter than six characters", async () => {
        const error = await validationError(
            new User({ ...validUser, password: "12345" })
        )

        assert.ok(error?.errors.password)
    })

    it("rejects an unknown user type", async () => {
        const error = await validationError(
            new User({
                ...validUser,
                userType: "SuperAdmin",
            })
        )

        assert.ok(error?.errors.userType)
    })

    it("keeps email unique at the index level", () => {
        const emailIndex = User.schema
            .indexes()
            .find(([fields]) => "email" in fields)

        assert.ok(emailIndex, "email must be indexed")
        assert.equal(emailIndex[1].unique, true)
    })

    it("records timestamps for auditing", () => {
        assert.equal(User.schema.options.timestamps, true)
    })
})

describe("User#comparePassword", () => {
    it("returns true for the matching password", async () => {
        const hash = await bcrypt.hash("s3cret-password", 10)
        const user = new User({ ...validUser, password: hash })

        assert.equal(await user.comparePassword("s3cret-password"), true)
    })

    it("returns false for a wrong password", async () => {
        const hash = await bcrypt.hash("s3cret-password", 10)
        const user = new User({ ...validUser, password: hash })

        assert.equal(await user.comparePassword("s3cret-passwerd"), false)
        assert.equal(await user.comparePassword(""), false)
    })
})
