"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  createdAt: string;
  updatedAt: string;
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { locale } = useLocale();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const role = (session?.user as any)?.role;
  const hasAdminAccess = role === "ADMIN";

  useEffect(() => {
    if (status === "loading") return;
    if (!hasAdminAccess) {
      toast({
        title: locale === "pl" ? "Brak dostepu do zarzadzania uzytkownikami" : "No access to user management",
        variant: "destructive",
      });
      router.replace("/dashboard");
    }
  }, [hasAdminAccess, locale, router, status, toast]);

  const fetchUsers = useCallback(async () => {
    if (status !== "authenticated" || !hasAdminAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "API_ERROR");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hasAdminAccess, locale, page, search, status, toast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setCreateOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: data.error || t("common.error", locale), variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  }

  function openEditDialog(user: UserItem) {
    setSelectedUser(user);
    setEditOpen(true);
  }

  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("newPassword"),
        }),
      });

      if (res.ok) {
        toast({ title: t("common.success", locale) });
        setEditOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: data.error || t("common.error", locale), variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm(t("common.confirm_delete", locale))) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("common.success", locale) });
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: data.error || t("common.error", locale), variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    }
  }

  if (status === "loading" || !hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("users.title", locale)}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("users.add", locale)}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("users.add", locale)}</DialogTitle>
              <DialogDescription>
                {locale === "pl" ? "Dodaj nowego pracownika" : "Add a new employee user"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">{t("users.name", locale)} *</Label>
                  <Input id="create-name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">{t("users.email", locale)} *</Label>
                  <Input id="create-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">{t("users.password", locale)} *</Label>
                  <Input id="create-password" name="password" type="password" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("common.cancel", locale)}
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.save", locale)}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={t("users.search", locale)}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("users.no_users", locale)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.name", locale)}</TableHead>
                  <TableHead>{t("users.email", locale)}</TableHead>
                  <TableHead>{t("users.role", locale)}</TableHead>
                  <TableHead>{t("cards.created", locale)}</TableHead>
                  <TableHead className="text-right">{locale === "pl" ? "Akcje" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role === "ADMIN" ? t("users.admin", locale) : t("users.employee", locale)}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("common.previous", locale)}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common.page", locale)} {page} {t("common.of", locale)} {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("common.next", locale)}
          </Button>
        </div>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === "pl" ? "Edytuj uzytkownika" : "Edit user"}</DialogTitle>
            <DialogDescription>
              {locale === "pl" ? "Mozesz opcjonalnie ustawic nowe haslo" : "You can optionally set a new password"}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">{t("users.name", locale)} *</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedUser.name || ""} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">{t("users.email", locale)} *</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={selectedUser.email} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">{t("users.new_password", locale)}</Label>
                  <Input id="edit-password" name="newPassword" type="password" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  {t("common.cancel", locale)}
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.save", locale)}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
