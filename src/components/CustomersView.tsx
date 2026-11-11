import React, { useState } from 'react';
import {
  Customer,
  Tenant,
  Branch,
  AppUser,
  CustomerDocument,
  DocumentVerificationStatus,
  CustomerSegment,
  CustomerGroup,
} from '../types';
import { formatUGX } from '../utils/finance';
import { CustomerDocumentManager } from './CustomerDocumentManager';
import { CustomerKycDropZone } from './CustomerKycDropZone';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import { SEED_CUSTOMER_GROUPS } from '../data/seedData';
import {
  Users,
  Search,
  PlusCircle,
  AlertTriangle,
  UserCheck,
  FileText,
  Camera,
  FolderOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Paperclip,
  PenTool,
  UploadCloud,
  Layers,
  ShieldAlert,
  Award,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  Check,
  X,
  Filter,
  Building2,
  Eye,
  Info,
  Briefcase,
  Sprout,
  TrendingUp,
} from 'lucide-react';

interface CustomersViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  customers: Customer[];
  documents?: CustomerDocument[];
  groups?: CustomerGroup[];
  onAddCustomer: (customerData: Omit<Customer, 'id' | 'customerNo' | 'createdAt'>) => void;
  onSelectCustomer: (customer: Customer) => void;
  onAddDocument?: (doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => void;
  onUpdateDocumentStatus?: (docId: string, status: DocumentVerificationStatus, notes?: string) => void;
  onDeleteDocument?: (docId: string) => void;
  onAddGroup?: (group: Omit<CustomerGroup, 'id' | 'groupNo' | 'formationDate'>) => void;
  onUpdateCustomerVerification?: (customerId: string, status: 'verified' | 'pending' | 'flagged') => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  tenant,
  branch,
  currentUser,
  customers,
  documents = [],
  groups: propGroups,
  onAddCustomer,
  onSelectCustomer,
  onAddDocument = () => {},
  onUpdateDocumentStatus = () => {},
  onDeleteDocument = () => {},
  onAddGroup,
  onUpdateCustomerVerification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dossiers' | 'kyc_vault' | 'groups' | 'dpa_register'>('dossiers');
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>('all');
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<'all' | 'verified' | 'pending' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [managingDocsCustomer, setManagingDocsCustomer] = useState<Customer | null>(null);
  const [signingCustomer, setSigningCustomer] = useState<Customer | null>(null);
  const [dropZoneCustomer, setDropZoneCustomer] = useState<Customer | null>(null);

  // Local state for groups if not passed from parent
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>(
    propGroups && propGroups.length > 0 ? propGroups : SEED_CUSTOMER_GROUPS
  );

  // Local customer verification override tracking
  const [localVerificationOverrides, setLocalVerificationOverrides] = useState<Record<string, 'verified' | 'pending' | 'flagged'>>({});

  // New Customer Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+256 ',
    email: '',
    type: 'individual' as Customer['type'],
    segment: 'micro_enterprise' as CustomerSegment,
    groupId: '',
    groupRole: 'member' as Customer['groupRole'],
    occupation: '',
    businessName: '',
    monthlyIncome: 2_500_000,
    monthlyExpenses: 1_200_000,
    creditScoreRating: 'B' as Customer['creditScoreRating'],
    nin: '',
    residenceTown: '',
    residenceDistrict: 'Kampala',
    nextOfKinName: '',
    nextOfKinPhone: '+256 ',
    nextOfKinRelationship: 'Spouse',
    dpaConsent: true,
    crbConsent: true,
    momoConsent: true,
    marketingOptIn: false,
  });

  // New Group Form State
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    type: 'vsla' as CustomerGroup['type'],
    meetingDay: 'Wednesday' as CustomerGroup['meetingDay'],
    meetingLocation: '',
    chairpersonName: '',
    chairpersonPhone: '+256 ',
    secretaryName: '',
    secretaryPhone: '+256 ',
    treasurerName: '',
    treasurerPhone: '+256 ',
    jointLiabilityPledgeUGX: 10_000_000,
  });

  const tenantCustomers = customers.filter((c) => c.tenantId === tenant.id);

  // Duplicate Check logic (PRD M02)
  const isDuplicateNIN =
    formData.nin.trim() !== '' &&
    tenantCustomers.some((c) =>
      c.kyc.idNumberMasked.toLowerCase().includes(formData.nin.toLowerCase().slice(-4))
    );
  const isDuplicatePhone =
    formData.phone.length > 7 &&
    tenantCustomers.some(
      (c) => c.phone.replace(/\s+/g, '') === formData.phone.replace(/\s+/g, '')
    );

  const filteredCustomers = tenantCustomers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const effectiveStatus = localVerificationOverrides[c.id] || c.verificationBadge || c.kyc.verificationStatus;

    const matchesSearch =
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.customerNo.toLowerCase().includes(q) ||
      c.occupation.toLowerCase().includes(q) ||
      c.kyc.idNumberMasked.toLowerCase().includes(q) ||
      (c.businessName && c.businessName.toLowerCase().includes(q));

    const matchesSegment = selectedSegment === 'all' || c.segment === selectedSegment;
    const matchesVerification =
      selectedVerificationStatus === 'all' || effectiveStatus === selectedVerificationStatus;

    return matchesSearch && matchesSegment && matchesVerification;
  });

  const handleVerificationToggle = (customerId: string, nextStatus: 'verified' | 'pending' | 'flagged') => {
    setLocalVerificationOverrides((prev) => ({
      ...prev,
      [customerId]: nextStatus,
    }));
    if (onUpdateCustomerVerification) {
      onUpdateCustomerVerification(customerId, nextStatus);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) return;

    onAddCustomer({
      tenantId: tenant.id,
      branchId: branch.id,
      type: formData.type,
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email.trim() ? formData.email : undefined,
      businessName: formData.businessName.trim() ? formData.businessName : undefined,
      occupation: formData.occupation,
      monthlyIncome: Number(formData.monthlyIncome),
      monthlyExpenses: Number(formData.monthlyExpenses),
      creditScoreRating: formData.creditScoreRating,
      segment: formData.segment,
      groupId: formData.groupId ? formData.groupId : undefined,
      groupRole: formData.groupId ? formData.groupRole : undefined,
      verificationBadge: 'pending',
      dataProtectionConsent: {
        consentedAt: new Date().toISOString(),
        consentVersion: 'v2.1-UG-DPA-2019',
        crbDisclosureAgreed: formData.crbConsent,
        mobileMoneyProcessingAgreed: formData.momoConsent,
        marketingOptIn: formData.marketingOptIn,
        dpa2019RegistrationNo: `PDPO-UG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      },
      kyc: {
        idType: 'NIN',
        idNumberMasked: formData.nin ? `${formData.nin.slice(0, 4)}****${formData.nin.slice(-4)}` : 'CM8901****902K',
        verifiedAt: new Date().toISOString().split('T')[0],
        verificationStatus: 'pending',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        nextOfKinName: formData.nextOfKinName,
        nextOfKinPhone: formData.nextOfKinPhone,
        nextOfKinRelationship: formData.nextOfKinRelationship,
        residenceTown: formData.residenceTown,
        residenceDistrict: formData.residenceDistrict,
      },
      status: 'active',
    });

    setShowAddModal(false);
    setFormData({
      fullName: '',
      phone: '+256 ',
      email: '',
      type: 'individual',
      segment: 'micro_enterprise',
      groupId: '',
      groupRole: 'member',
      occupation: '',
      businessName: '',
      monthlyIncome: 2_500_000,
      monthlyExpenses: 1_200_000,
      creditScoreRating: 'B',
      nin: '',
      residenceTown: '',
      residenceDistrict: 'Kampala',
      nextOfKinName: '',
      nextOfKinPhone: '+256 ',
      nextOfKinRelationship: 'Spouse',
      dpaConsent: true,
      crbConsent: true,
      momoConsent: true,
      marketingOptIn: false,
    });
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;

    const newGroup: CustomerGroup = {
      id: `grp-${Date.now()}`,
      tenantId: tenant.id,
      branchId: branch.id,
      groupNo: `GRP-KLA-00${customerGroups.length + 1}`,
      name: groupFormData.name,
      type: groupFormData.type,
      meetingDay: groupFormData.meetingDay,
      meetingLocation: groupFormData.meetingLocation,
      chairpersonName: groupFormData.chairpersonName,
      chairpersonPhone: groupFormData.chairpersonPhone,
      secretaryName: groupFormData.secretaryName,
      secretaryPhone: groupFormData.secretaryPhone,
      treasurerName: groupFormData.treasurerName,
      treasurerPhone: groupFormData.treasurerPhone,
      jointLiabilityPledgeUGX: Number(groupFormData.jointLiabilityPledgeUGX),
      totalMembers: 1,
      status: 'active',
      formationDate: new Date().toISOString().split('T')[0],
    };

    setCustomerGroups((prev) => [newGroup, ...prev]);
    if (onAddGroup) {
      onAddGroup(newGroup);
    }
    setShowAddGroupModal(false);
  };

  const getSegmentBadge = (segment?: CustomerSegment) => {
    switch (segment) {
      case 'micro_enterprise':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Briefcase className="w-3 h-3" /> Micro Enterprise
          </span>
        );
      case 'agricultural_sme':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sprout className="w-3 h-3" /> Agri SME
          </span>
        );
      case 'vsla_group':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-3 h-3" /> VSLA Solidarity
          </span>
        );
      case 'salary_earner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-3 h-3" /> Salary Earner
          </span>
        );
      case 'youth_trader':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Award className="w-3 h-3" /> Youth Trader
          </span>
        );
      case 'women_in_business':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Award className="w-3 h-3" /> Women in Business
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
            General
          </span>
        );
    }
  };

  const getVerificationPill = (status: 'verified' | 'pending' | 'flagged') => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified KYC
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Flagged KYC
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Customer KYC & Onboarding Hub</h2>
                <p className="text-xs text-slate-400">
                  Compliant with Uganda Data Protection and Privacy Act 2019 & UMRA Tier 4 KYC Regulations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
            >
              <UserPlus className="w-4 h-4 text-purple-400" />
              Form VSLA Group
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Customer
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab('dossiers')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'dossiers'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Customer &amp; KYC Dossiers ({tenantCustomers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('kyc_vault')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'kyc_vault'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>KYC Vault &amp; Drop Zone ({documents.length} Docs)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
              activeSubTab === 'groups'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Group Formation & Solidarity VSLAs ({customerGroups.length})
          </button>
          <button
            onClick={() => setActiveSubTab('dpa_register')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
              activeSubTab === 'dpa_register'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Uganda Data Protection (DPA 2019) Register
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Customer & KYC Dossiers */}
      {activeSubTab === 'dossiers' && (
        <div className="space-y-4">
          {/* Filter Bar & Segmentation Pills */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, phone (+256), NIN, customer number, or occupation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">KYC Status:</span>
                <select
                  value={selectedVerificationStatus}
                  onChange={(e) => setSelectedVerificationStatus(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Pending Review Only</option>
                  <option value="flagged">Flagged Only</option>
                </select>
              </div>
            </div>

            {/* Segmentation Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Segment:
              </span>
              {[
                { id: 'all', label: 'All Segments' },
                { id: 'micro_enterprise', label: 'Micro Enterprise' },
                { id: 'agricultural_sme', label: 'Agri SME' },
                { id: 'vsla_group', label: 'VSLA / Group' },
                { id: 'salary_earner', label: 'Salary Earners' },
                { id: 'youth_trader', label: 'Youth Traders' },
                { id: 'women_in_business', label: 'Women in Business' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setSelectedSegment(seg.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedSegment === seg.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact & Location</th>
                    <th className="py-3 px-4">Segment & Group</th>
                    <th className="py-3 px-4">Financials & Score</th>
                    <th className="py-3 px-4">KYC Status</th>
                    <th className="py-3 px-4">DPA 2019</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No customers found matching the search or segment criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const effectiveStatus =
                        localVerificationOverrides[cust.id] || cust.verificationBadge || cust.kyc.verificationStatus;
                      const customerDocs = documents.filter((d) => d.customerId === cust.id);
                      const assignedGroup = customerGroups.find((g) => g.id === cust.groupId);

                      return (
                        <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0 overflow-hidden">
                                {cust.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{cust.fullName}</div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>{cust.customerNo}</span>
                                  <span>•</span>
                                  <span>NIN: {cust.kyc.idNumberMasked}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-mono text-[11px] flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              {cust.phone}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {cust.kyc.residenceTown}, {cust.kyc.residenceDistrict}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div>{getSegmentBadge(cust.segment)}</div>
                              {assignedGroup && (
                                <div className="text-[11px] text-purple-400 flex items-center gap-1 font-medium">
                                  <Users className="w-3 h-3" />
                                  {assignedGroup.name} ({cust.groupRole || 'Member'})
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-medium">
                              {formatUGX(cust.monthlyIncome)} <span className="text-[10px] text-slate-400">/mo</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Score:</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold ${
                                  cust.creditScoreRating === 'A'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : cust.creditScoreRating === 'B'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {cust.creditScoreRating}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div>{getVerificationPill(effectiveStatus as any)}</div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <FileText className="w-3 h-3 text-slate-500" />
                                <span>{customerDocs.length} Docs on file</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {cust.dataProtectionConsent ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <ShieldCheck className="w-3 h-3 text-blue-400" /> DPA 2019 Reg
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {cust.dataProtectionConsent.dpa2019RegistrationNo}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-500">Unregistered</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick KYC Status Toggle */}
                              <button
                                title="Toggle KYC Status"
                                onClick={() => {
                                  const next =
                                    effectiveStatus === 'verified'
                                      ? 'flagged'
                                      : effectiveStatus === 'flagged'
                                      ? 'pending'
                                      : 'verified';
                                  handleVerificationToggle(cust.id, next);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              </button>

                              {/* Manage Documents Button */}
                              <button
                                title="Manage KYC Documents"
                                onClick={() => setManagingDocsCustomer(cust)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                              </button>

                              {/* Direct KYC Vault & Drop Zone */}
                              <button
                                title="Upload KYC to Vault (Drag & Drop)"
                                onClick={() => {
                                  setDropZoneCustomer(cust);
                                  setActiveSubTab('kyc_vault');
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition hover:border-sky-500/50"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                              </button>

                              {/* Signatures */}
                              <button
                                title="Digital Signature"
                                onClick={() => setSigningCustomer(cust)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                <PenTool className="w-3.5 h-3.5 text-purple-400" />
                              </button>

                              {/* View Full Dossier */}
                              <button
                                title="View Customer Dossier"
                                onClick={() => setSelectedCustomerDetail(cust)}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Group Formation & Solidarity VSLAs */}
      {activeSubTab === 'groups' && (
        <div className="space-y-6">
          {/* Group Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400">Active Solidarity Groups</div>
              <div className="text-2xl font-bold text-white mt-1">{customerGroups.length}</div>
              <div className="text-[11px] text-purple-400 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> VSLAs & SACCO Cells
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400">Combined Joint Liability Pledge</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {formatUGX(customerGroups.reduce((acc, g) => acc + g.jointLiabilityPledgeUGX, 0))}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Solidarity Guarantee backing loans</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400">Total Group Borrowers</div>
              <div className="text-2xl font-bold text-white mt-1">
                {customerGroups.reduce((acc, g) => acc + g.totalMembers, 0)}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">100% Onboarding verified</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400">Average Group Size</div>
              <div className="text-2xl font-bold text-white mt-1">
                {customerGroups.length > 0
                  ? Math.round(customerGroups.reduce((acc, g) => acc + g.totalMembers, 0) / customerGroups.length)
                  : 0}{' '}
                <span className="text-xs text-slate-400 font-normal">members</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Peer monitoring enabled</div>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {customerGroups.map((group) => {
              const groupMembers = tenantCustomers.filter((c) => c.groupId === group.id);

              return (
                <div
                  key={group.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase">
                        {group.type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{group.groupNo}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{group.name}</h3>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Meeting: {group.meetingDay}s</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{group.meetingLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Joint Pledge: {formatUGX(group.jointLiabilityPledgeUGX)}</span>
                      </div>
                    </div>

                    {/* Leadership Roster */}
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Elected Leadership
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Chairperson:</span>
                          <span className="text-white font-medium">{group.chairpersonName}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Phone:</span>
                          <span className="text-slate-300 font-mono">{group.chairpersonPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Secretary:</span>
                          <span className="text-white font-medium">{group.secretaryName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Treasurer:</span>
                          <span className="text-white font-medium">{group.treasurerName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{group.totalMembers} Registered Members</span>
                    <button
                      onClick={() => {
                        setSelectedSegment('vsla_group');
                        setActiveSubTab('dossiers');
                      }}
                      className="text-purple-400 hover:text-purple-300 font-medium transition flex items-center gap-1"
                    >
                      View Members &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Uganda Data Protection (DPA 2019) Register */}
      {activeSubTab === 'dpa_register' && (
        <div className="space-y-6">
          {/* Statutory Explainer Card */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-5 flex items-start gap-4">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-blue-200">
                Uganda Data Protection & Privacy Act 2019 Statutory Compliance Register
              </h3>
              <p className="text-xs text-blue-300/80 leading-relaxed">
                As a Tier 4 Microfinance Institution licensed under UMRA, our platform logs and enforces verifiable
                customer consent before transmitting identity tokens to NIRA, Credit Reference Bureaus (CRB), and
                Telecom Mobile Money switches (MTN MoMo & Airtel Money). Customers retain statutory rights under Section 24
                (Right to Rectification) and Section 27 (Right to Prevent Processing).
              </p>
            </div>
          </div>

          {/* Compliance Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-white">Consents & Disclosures Audit Trail</h4>
                <p className="text-xs text-slate-400">Audit-ready register for Personal Data Protection Office (PDPO)</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                100% Compliant
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Customer Name & ID</th>
                    <th className="py-3 px-4">PDPO Registration No</th>
                    <th className="py-3 px-4">Consent Timestamp</th>
                    <th className="py-3 px-4 text-center">CRB Disclosure</th>
                    <th className="py-3 px-4 text-center">MoMo / Bank Processing</th>
                    <th className="py-3 px-4 text-center">Direct Marketing</th>
                    <th className="py-3 px-4 text-right">Policy Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tenantCustomers.map((cust) => {
                    const consent = cust.dataProtectionConsent;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{cust.fullName}</div>
                          <div className="text-[11px] text-slate-400">{cust.customerNo}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-400 text-[11px]">
                          {consent ? consent.dpa2019RegistrationNo : 'PDPO-UG-PENDING'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {consent ? new Date(consent.consentedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {consent?.crbDisclosureAgreed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Agreed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                              <X className="w-3.5 h-3.5" /> Declined
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {consent?.mobileMoneyProcessingAgreed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Agreed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                              <X className="w-3.5 h-3.5" /> Declined
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {consent?.marketingOptIn ? (
                            <span className="text-emerald-400 font-medium">Opted-in</span>
                          ) : (
                            <span className="text-slate-500 font-medium">Opted-out</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                          {consent?.consentVersion || 'v2.1-UG-DPA-2019'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Dedicated Customer Vault & Drag-and-Drop Zone */}
      {activeSubTab === 'kyc_vault' && (
        <CustomerKycDropZone
          tenant={tenant}
          currentUser={currentUser}
          customers={tenantCustomers}
          documents={documents}
          selectedCustomer={dropZoneCustomer}
          onSelectCustomer={setDropZoneCustomer}
          onAddDocument={(doc) => {
            onAddDocument(doc);
          }}
          onUpdateDocumentStatus={(docId, status, notes) => {
            onUpdateDocumentStatus(docId, status, notes);
          }}
          onDeleteDocument={(docId) => {
            onDeleteDocument(docId);
          }}
        />
      )}

      {/* Customer Document Manager Modal */}
      {managingDocsCustomer && (
        <CustomerDocumentManager
          customer={managingDocsCustomer}
          documents={documents.filter((d) => d.customerId === managingDocsCustomer.id)}
          currentUser={currentUser}
          tenant={tenant}
          isOpen={true}
          onClose={() => setManagingDocsCustomer(null)}
          onAddDocument={(doc) => {
            onAddDocument(doc);
          }}
          onUpdateDocumentStatus={(docId: string, status: DocumentVerificationStatus, notes?: string) => {
            onUpdateDocumentStatus(docId, status, notes);
          }}
          onDeleteDocument={(docId: string) => {
            onDeleteDocument(docId);
          }}
        />
      )}

      {/* Digital Signature Modal */}
      {signingCustomer && (
        <DigitalSignatureModal
          customer={signingCustomer}
          currentUser={currentUser}
          tenant={tenant}
          isOpen={true}
          onClose={() => setSigningCustomer(null)}
          onSaveSignedDocument={(doc) => {
            onAddDocument(doc);
            setSigningCustomer(null);
          }}
        />
      )}

      {/* Detailed Customer Dossier Modal */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-lg">
                  {selectedCustomerDetail.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCustomerDetail.fullName}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedCustomerDetail.customerNo} • {selectedCustomerDetail.occupation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-400 uppercase text-[11px]">Identification & Contact</div>
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <span className="text-white font-mono">{selectedCustomerDetail.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500">NIN: </span>
                  <span className="text-white font-mono">{selectedCustomerDetail.kyc.idNumberMasked}</span>
                </div>
                <div>
                  <span className="text-slate-500">Residence: </span>
                  <span className="text-white">
                    {selectedCustomerDetail.kyc.residenceTown}, {selectedCustomerDetail.kyc.residenceDistrict}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Date of Birth: </span>
                  <span className="text-white">{selectedCustomerDetail.kyc.dateOfBirth}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-400 uppercase text-[11px]">Financials & Credit Rating</div>
                <div>
                  <span className="text-slate-500">Monthly Income: </span>
                  <span className="text-emerald-400 font-semibold">{formatUGX(selectedCustomerDetail.monthlyIncome)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Monthly Expenses: </span>
                  <span className="text-slate-300">{formatUGX(selectedCustomerDetail.monthlyExpenses)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Credit Score: </span>
                  <span className="text-white font-bold">{selectedCustomerDetail.creditScoreRating}</span>
                </div>
                <div>
                  <span className="text-slate-500">Segment: </span>
                  <span className="text-white">{selectedCustomerDetail.segment?.replace('_', ' ') || 'General'}</span>
                </div>
              </div>
            </div>

            {/* Next of Kin */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-400 uppercase text-[11px]">Next of Kin</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500">Name: </span>
                  <div className="text-white font-medium">{selectedCustomerDetail.kyc.nextOfKinName}</div>
                </div>
                <div>
                  <span className="text-slate-500">Relationship: </span>
                  <div className="text-white">{selectedCustomerDetail.kyc.nextOfKinRelationship}</div>
                </div>
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <div className="text-white font-mono">{selectedCustomerDetail.kyc.nextOfKinPhone}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setManagingDocsCustomer(selectedCustomerDetail);
                  setSelectedCustomerDetail(null);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Inspect Attached Documents
              </button>
              <button
                onClick={() => {
                  setDropZoneCustomer(selectedCustomerDetail);
                  setSelectedCustomerDetail(null);
                  setActiveSubTab('kyc_vault');
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Drop KYC Files to Vault
              </button>
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Onboard New Customer (KYC Capture)</h3>
                  <p className="text-xs text-slate-400">Capture identity, contact, segmentation, and statutory DPA 2019 consent</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Duplicate warnings */}
              {isDuplicateNIN && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Warning: A customer with this National ID suffix already exists in Victoria Microfinance records.</span>
                </div>
              )}
              {isDuplicatePhone && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Warning: This phone number is already registered to an existing customer record.</span>
                </div>
              )}

              {/* Section 1: Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Betty Namagembe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number (+256) *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">National ID (NIN) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value.toUpperCase() })}
                    placeholder="CF901238812K"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Segment</label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value as CustomerSegment })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="micro_enterprise">Micro Enterprise</option>
                    <option value="agricultural_sme">Agricultural SME</option>
                    <option value="vsla_group">VSLA / Solidarity Group</option>
                    <option value="salary_earner">Salary Earner</option>
                    <option value="youth_trader">Youth Trader</option>
                    <option value="women_in_business">Women in Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assign to Group</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None (Individual Borrower)</option>
                    {customerGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Retail Trader, Market Vendor"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Business Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Nakasero Fresh Fruits"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Income (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Expenses (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={formData.monthlyExpenses}
                    onChange={(e) => setFormData({ ...formData, monthlyExpenses: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Location & Next of Kin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Residence Town</label>
                  <input
                    type="text"
                    value={formData.residenceTown}
                    onChange={(e) => setFormData({ ...formData, residenceTown: e.target.value })}
                    placeholder="e.g. Katwe, Ntinda"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">District</label>
                  <input
                    type="text"
                    value={formData.residenceDistrict}
                    onChange={(e) => setFormData({ ...formData, residenceDistrict: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Next of Kin Name & Phone</label>
                  <input
                    type="text"
                    value={formData.nextOfKinName}
                    onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Statutory Data Protection & Privacy Act 2019 Consent */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Uganda Data Protection and Privacy Act 2019 Consent</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dpaConsent}
                      onChange={(e) => setFormData({ ...formData, dpaConsent: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>
                      Customer consents to lawful data collection, digital verification against NIRA databases, and storage under DPA 2019.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.crbConsent}
                      onChange={(e) => setFormData({ ...formData, crbConsent: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>
                      Customer authorizes submission of credit and repayment histories to licensed Credit Reference Bureaus (CRB).
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.momoConsent}
                      onChange={(e) => setFormData({ ...formData, momoConsent: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>
                      Customer authorizes automated transaction processing and reconciliation with MTN MoMo, Airtel Money, and Partner Banks.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form New Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Form Solidarity VSLA / Group</h3>
                  <p className="text-xs text-slate-400">Charter a solidarity peer lending cell</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGroupSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Group Legal / Registered Name *</label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="e.g. Owino Market Women Solidarity VSLA"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Group Structure</label>
                  <select
                    value={groupFormData.type}
                    onChange={(e) => setGroupFormData({ ...groupFormData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="vsla">VSLA (Village Savings & Loan)</option>
                    <option value="sacco_cell">SACCO Solidarity Cell</option>
                    <option value="peer_guarantee">Peer Guarantee Group</option>
                    <option value="solidarity_group">Solidarity Cell</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Meeting Day</label>
                  <select
                    value={groupFormData.meetingDay}
                    onChange={(e) => setGroupFormData({ ...groupFormData, meetingDay: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Meeting Location</label>
                <input
                  type="text"
                  value={groupFormData.meetingLocation}
                  onChange={(e) => setGroupFormData({ ...groupFormData, meetingLocation: e.target.value })}
                  placeholder="e.g. Katwe Community Center Hall"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Chairperson Full Name</label>
                  <input
                    type="text"
                    required
                    value={groupFormData.chairpersonName}
                    onChange={(e) => setGroupFormData({ ...groupFormData, chairpersonName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Chairperson Phone</label>
                  <input
                    type="text"
                    required
                    value={groupFormData.chairpersonPhone}
                    onChange={(e) => setGroupFormData({ ...groupFormData, chairpersonPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Secretary Full Name</label>
                  <input
                    type="text"
                    value={groupFormData.secretaryName}
                    onChange={(e) => setGroupFormData({ ...groupFormData, secretaryName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Treasurer Full Name</label>
                  <input
                    type="text"
                    value={groupFormData.treasurerName}
                    onChange={(e) => setGroupFormData({ ...groupFormData, treasurerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Joint Liability Pledge (UGX)</label>
                <input
                  type="number"
                  step="1000000"
                  value={groupFormData.jointLiabilityPledgeUGX}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, jointLiabilityPledgeUGX: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition"
                >
                  Charter Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
