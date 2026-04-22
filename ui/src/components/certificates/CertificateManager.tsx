'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  certificatesApi,
  certificateTemplatesApi,
  idCardsApi,
  idCardTemplatesApi,
  CertificateResponse,
  CertificateTemplateResponse,
  IDCardResponse,
  IDCardTemplateResponse,
  CreateCertificateRequest,
  CreateCertificateTemplateRequest,
  CreateIDCardRequest,
  CreateIDCardTemplateRequest,
} from '@/services/api/certificatesApi';

interface Stats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  printedCertificates: number;
  totalIDCards: number;
  activeIDCards: number;
}

export default function CertificateManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTab, setSelectedTab] = useState('certificates');

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['certificate-stats'],
    queryFn: () => certificatesApi.getStats(),
  });

  // Fetch certificates
  const { data: certificatesData, isLoading: certificatesLoading } = useQuery({
    queryKey: ['certificates', page, pageSize],
    queryFn: () => certificatesApi.list(page, pageSize),
  });

  // Fetch certificate templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['certificate-templates', page, pageSize],
    queryFn: () => certificateTemplatesApi.list(page, pageSize),
  });

  // Fetch ID cards
  const { data: idCardsData, isLoading: idCardsLoading } = useQuery({
    queryKey: ['id-cards', page, pageSize],
    queryFn: () => idCardsApi.list(page, pageSize),
  });

  // Fetch ID card templates
  const { data: idCardTemplatesData, isLoading: idCardTemplatesLoading } = useQuery({
    queryKey: ['id-card-templates', page, pageSize],
    queryFn: () => idCardTemplatesApi.list(page, pageSize),
  });

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: (id: string) => certificatesApi.revoke(id),
    onSuccess: () => {
      toast.success('Certificate revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke certificate');
    },
  });

  const printMutation = useMutation({
    mutationFn: (id: string) => certificatesApi.markAsPrinted(id),
    onSuccess: () => {
      toast.success('Certificate marked as printed');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark as printed');
    },
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id: string) => certificatesApi.delete(id),
    onSuccess: () => {
      toast.success('Certificate deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete certificate');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => certificateTemplatesApi.delete(id),
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const deleteIDCardMutation = useMutation({
    mutationFn: (id: string) => idCardsApi.delete(id),
    onSuccess: () => {
      toast.success('ID card deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['id-cards'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete ID card');
    },
  });

  const deleteIDCardTemplateMutation = useMutation({
    mutationFn: (id: string) => idCardTemplatesApi.delete(id),
    onSuccess: () => {
      toast.success('ID card template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete ID card template');
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCertificates ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeCertificates ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.revokedCertificates ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Printed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.printedCertificates ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total ID Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIDCards ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active ID Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeIDCards ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="cert-templates">Cert Templates</TabsTrigger>
          <TabsTrigger value="id-cards">ID Cards</TabsTrigger>
          <TabsTrigger value="card-templates">Card Templates</TabsTrigger>
        </TabsList>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>Manage student certificates and their status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Certificate #</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Student</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Printed</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificatesData?.items?.map((cert: CertificateResponse) => (
                      <tr key={cert.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{cert.certificateNumber}</td>
                        <td className="px-4 py-2">{cert.certificateType}</td>
                        <td className="px-4 py-2">{cert.studentName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                              cert.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : cert.status === 'Revoked'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {cert.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{cert.isPrinted ? '✓' : '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {cert.status === 'Active' && (
                              <>
                                {!cert.isPrinted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => printMutation.mutate(cert.id)}
                                    disabled={printMutation.isPending}
                                  >
                                    Print
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => revokeMutation.mutate(cert.id)}
                                  disabled={revokeMutation.isPending}
                                >
                                  Revoke
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCertMutation.mutate(cert.id)}
                              disabled={deleteCertMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!certificatesData?.items?.length && !certificatesLoading && (
                <div className="py-8 text-center text-gray-500">No certificates found</div>
              )}

              {/* Pagination */}
              {certificatesData?.totalPages ?? 0 > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Page {page} of {certificatesData?.totalPages ?? 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === (certificatesData?.totalPages ?? 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificate Templates Tab */}
        <TabsContent value="cert-templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Templates</CardTitle>
              <CardDescription>Manage certificate templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Issued</th>
                      <th className="px-4 py-2 text-left">Active</th>
                      <th className="px-4 py-2 text-left">Default</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templatesData?.items?.map((template: CertificateTemplateResponse) => (
                      <tr key={template.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{template.name}</td>
                        <td className="px-4 py-2">{template.certificateType}</td>
                        <td className="px-4 py-2">{template.certificatesIssuedCount}</td>
                        <td className="px-4 py-2">{template.isActive ? '✓' : '—'}</td>
                        <td className="px-4 py-2">{template.isDefault ? '✓' : '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!templatesData?.items?.length && !templatesLoading && (
                <div className="py-8 text-center text-gray-500">No templates found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ID Cards Tab */}
        <TabsContent value="id-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ID Cards</CardTitle>
              <CardDescription>Manage ID cards and their status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Card #</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Holder</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Expiry</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idCardsData?.items?.map((card: IDCardResponse) => (
                      <tr key={card.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{card.cardNumber}</td>
                        <td className="px-4 py-2">{card.cardType}</td>
                        <td className="px-4 py-2">{card.holderName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                              card.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {card.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{new Date(card.expiryDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteIDCardMutation.mutate(card.id)}
                            disabled={deleteIDCardMutation.isPending}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!idCardsData?.items?.length && !idCardsLoading && (
                <div className="py-8 text-center text-gray-500">No ID cards found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ID Card Templates Tab */}
        <TabsContent value="card-templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ID Card Templates</CardTitle>
              <CardDescription>Manage ID card templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Card Type</th>
                      <th className="px-4 py-2 text-left">Issued</th>
                      <th className="px-4 py-2 text-left">Active</th>
                      <th className="px-4 py-2 text-left">QR Code</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idCardTemplatesData?.items?.map((template: IDCardTemplateResponse) => (
                      <tr key={template.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{template.name}</td>
                        <td className="px-4 py-2">{template.cardType}</td>
                        <td className="px-4 py-2">{template.cardsIssuedCount}</td>
                        <td className="px-4 py-2">{template.isActive ? '✓' : '—'}</td>
                        <td className="px-4 py-2">{template.showQRCode ? '✓' : '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteIDCardTemplateMutation.mutate(template.id)}
                            disabled={deleteIDCardTemplateMutation.isPending}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!idCardTemplatesData?.items?.length && !idCardTemplatesLoading && (
                <div className="py-8 text-center text-gray-500">No templates found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
