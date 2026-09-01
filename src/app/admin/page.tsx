import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, AlertCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Dashboard | FAY Stats",
};

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground text-lg">Resumen y gestión del sistema FAY Stats</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Campeonatos</CardTitle>
              <Trophy className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">45</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Regatistas</CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1,204</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clases</CardTitle>
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">8</div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Revisión Pendiente</CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">3</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-semibold tracking-tight mt-10">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-surface border-border hover:border-primary transition-colors cursor-pointer group">
            <Link href="/admin/campeonatos">
              <CardHeader>
                <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                  Gestión de Campeonatos <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>Crear, editar y publicar campeonatos</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="bg-surface border-border hover:border-primary transition-colors cursor-pointer group">
            <Link href="/admin/regatistas">
              <CardHeader>
                <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                  Gestión de Regatistas <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>Administrar perfiles y resolver duplicados</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="bg-surface border-border hover:border-primary transition-colors cursor-pointer group">
            <Link href="/admin/solicitudes">
              <CardHeader>
                <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                  Solicitudes de Vinculación <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>Revisar y aprobar reclamos de perfiles</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </main>
  );
}
