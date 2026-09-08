"use client"

import { useState } from "react"

import { deleteUserAction, setUserRoleAction } from "@/app/actions/users"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/file-kind"
import type { PublicUser } from "@/lib/auth/users"

type UserManagerProps = {
  users: PublicUser[]
  currentUserId: string
}

export function UserManager({ users, currentUserId }: UserManagerProps) {
  const [removeUser, setRemoveUser] = useState<PublicUser | null>(null)

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-medium">People</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isYou = user.id === currentUserId
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <span className="font-medium">{user.username}</span>
                  {isYou ? (
                    <Badge variant="outline" className="ml-2">
                      you
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {isYou ? null : (
                    <div className="flex justify-end gap-1">
                      <form action={setUserRoleAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={user.role === "admin" ? "user" : "admin"}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          {user.role === "admin" ? "Make user" : "Make admin"}
                        </Button>
                      </form>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoveUser(user)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={Boolean(removeUser)}
        onOpenChange={(open) => !open && setRemoveUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeUser?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to sign in. This does not delete their
              files in Blob.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteUserAction}>
              <input type="hidden" name="id" value={removeUser?.id ?? ""} />
              <AlertDialogAction
                variant="destructive"
                type="submit"
                onClick={() => setRemoveUser(null)}
              >
                Remove
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
