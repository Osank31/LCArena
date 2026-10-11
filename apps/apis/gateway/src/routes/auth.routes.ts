import express, { Router } from "express"
import { roleValidation } from "@LCArena/middlewares"
import { UserType } from "@LCArena/models"
import {
    changePassword,
    deleteAccount,
    login,
    loginWithOtp,
    logout,
    me,
    refresh,
    register,
    sendOtp,
    updateUserRole,
} from "../controllers/auth.controller"
import { authenticate } from "../middlewares/authenticate.middleware"

const router = Router()

// JSON body parsing is mounted only on auth routes, so proxied request bodies
// are streamed straight through instead of being buffered and re-serialized.
router.use(express.json())

// Public authentication flows
router.post("/send-otp", sendOtp)
router.post("/register", register)
router.post("/login-otp", loginWithOtp)
router.post("/login", login)
router.post("/refresh", refresh)
router.post("/logout", logout)

// Authenticated user self-service
router.get("/me", authenticate, me)
router.post("/change-password", authenticate, changePassword)
router.delete("/account", authenticate, deleteAccount)

// Admin-only role management (promotion / demotion)
router.patch(
    "/users/:userId/role",
    authenticate,
    roleValidation(UserType.Admin),
    updateUserRole
)

export const authRoutes = router
