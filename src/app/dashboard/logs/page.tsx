"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Search, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type LogItem = {
  id: string;
  actorId: string;
  actorRole: "COMPANY" | "ADMIN" | "EMPLOYEE";
  actorName: string | null;
  actorEmail: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: "CARD" | "TRANSACTION" | "TIER" | "PROMOTION";
  entityId: string;
  entityLabel: string | null;
  summary: string;
  changes: Record<string, unknown> | null;
  createdAt: string;
};

const actionOptions = ["", "CREATE", "UPDATE", "DELETE"] as const;
const entityTypeOptions = ["", "CARD", "TRANSACTION", "TIER", "PROMOTION"] as const;
const actorRoleOptions = ["", "COMPANY", "ADMIN", "EMPLOYEE"] as const;

export default function LogsPage() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search) params.set("search", search);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (actorRole) params.set("actorRole", actorRole);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.status === 403) {
        toast({
          title: locale === "pl" ? "Brak dostepu do logow" : "No access to logs",
          variant: "destructive",
        });
        setLogs([]);
        setTotalPages(1);
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast({ title: t("common.error", locale), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, action, entityType, actorRole, dateFrom, dateTo, locale, toast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionLabel: Record<string, string> = {
    CREATE: t("logs.created", locale),
    UPDATE: t("logs.updated", locale),
    DELETE: t("logs.deleted", locale),
  };

  const entityLabel: Record<string, string> = {
    CARD: t("logs.card", locale),
    TRANSACTION: t("logs.transaction", locale),
    TIER: t("logs.tier", locale),
    PROMOTION: t("logs.promotion", locale),
  };

  const actorRoleLabel: Record<string, string> = {
    COMPANY: t("logs.company", locale),
    ADMIN: t("logs.admin", locale),
    EMPLOYEE: t("logs.employee", locale),
  };

  function openDetails(log: LogItem) {
    setSelectedLog(log);
    setDetailsOpen(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("logs.title", locale)}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder={t("logs.search_placeholder", locale)}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          {actionOptions.map((value) => (
            <option key={value} value={value}>
              {value ? actionLabel[value] : t("logs.action", locale)}
            </option>
          ))}
        </select>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        >
          {entityTypeOptions.map((value) => (
            <option key={value} value={value}>
              {value ? entityLabel[value] : t("logs.entity", locale)}
            </option>
          ))}
        </select>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={actorRole}
          onChange={(e) => {
            setActorRole(e.target.value);
            setPage(1);
          }}
        >
          {actorRoleOptions.map((value) => (
            <option key={value} value={value}>
              {value ? actorRoleLabel[value] : t("logs.actor", locale)}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xl:col-span-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            aria-label={t("logs.date_from", locale)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            aria-label={t("logs.date_to", locale)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("logs.no_logs", locale)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transactions.date", locale)}</TableHead>
                  <TableHead>{t("logs.actor", locale)}</TableHead>
                  <TableHead>{t("logs.action", locale)}</TableHead>
                  <TableHead>{t("logs.entity", locale)}</TableHead>
                  <TableHead>{t("logs.description", locale)}</TableHead>
                  <TableHead className="text-right">{t("logs.details", locale)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.actorName || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.actorEmail || log.actorId} | {actorRoleLabel[log.actorRole]}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{actionLabel[log.action]}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entityLabel[log.entityType]}</p>
                        <p className="text-xs text-muted-foreground">{log.entityLabel || log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.summary}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetails(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("logs.details", locale)}</DialogTitle>
          </DialogHeader>
          {selectedLog?.changes ? (
            <div className="rounded-md border bg-muted/20 p-3 max-h-[60vh] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(selectedLog.changes, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.no_data", locale)}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
