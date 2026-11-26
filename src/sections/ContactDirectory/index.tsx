import { useCallback, useMemo, useRef, useState } from 'react';
import {
  At,
  CaretDown,
  ChatCircleDots,
  Check,
  Copy,
  GlobeHemisphereWest,
  MagnifyingGlass,
  MapPin,
  Phone,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import ReactCountryFlag from 'react-country-flag';
import { useAppStore } from '../../lib/store';
import { scrollToLocations } from '../../lib/lenis';
import { Dialog } from '../../components/Dialog';
import { CopyField } from '../../components/CopyField';
import {
  NETWORK_DATA,
  getLocalTimeAtLongitude,
  type LocationNode,
} from '../../lib/locations';
import { InternationalPhoneIcon } from '../Contact';
import siteData from '../../content/site.json';

/**
 * G3: Floating Contact Button & Contact Directory (DESIGN.md Section G3)
 * - Floating glassmorphism pill fixed at bottom-right adapting dynamically to bottomTheme.
 * - Opens a centered wide modal featuring GMS branding, structured Main Contacts matching
 *   the Contact section (Office Address, Phone Lines, International Line, Email Addresses +
 *   WhatsApp Us & copy controls), and a collapsible By Country directory with country flags,
 *   local times, and instant search.
 */
export function ContactDirectory() {
  const pillRef = useRef<HTMLButtonElement>(null);

  const isPreloaded = useAppStore((s) => s.isPreloaded);
  const isHeroPinned = useAppStore((s) => s.isHeroPinned);
  const isContactVisible = useAppStore((s) => s.isContactVisible);
  const isMobileMenuOpen = useAppStore((s) => s.isMobileMenuOpen);
  const bottomTheme = useAppStore((s) => s.bottomTheme);
  const activeDialog = useAppStore((s) => s.activeDialog);
  const setActiveDialog = useAppStore((s) => s.setActiveDialog);
  const setSelectedCountryId = useAppStore((s) => s.setSelectedCountryId);

  const isDark = bottomTheme === 'dark';
  const isOpen = activeDialog === 'directory';

  const companyName = siteData?.website_info?.company_name ?? 'Global Marine Supplies';
  const dirCopy = siteData?.contact_directory;
  const bandCopy = siteData?.contact_section?.details_band;
  const officesInfo = siteData?.contact_and_offices;
  const pillLabel = siteData?.navigation?.contact_pill_label ?? 'Contact us';

  const phones = officesInfo?.phones ?? [];
  const emails = officesInfo?.emails ?? [];
  const internationalLine = officesInfo?.international_line ?? '+1 945 9972408';
  const headOffice = officesInfo?.head_office;

  const [searchQuery, setSearchQuery] = useState('');
  const [openContinent, setOpenContinent] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);

  // Display floating pill after Hero through all sections, hiding during Preloader, Hero pinned, Contact section, or when mobile menu / dialog is active
  const isPillVisible =
    isPreloaded &&
    !isHeroPinned &&
    !isContactVisible &&
    !isMobileMenuOpen &&
    activeDialog === null;

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!trimmedQuery) return NETWORK_DATA.groups;
    return NETWORK_DATA.groups
      .map((group) => {
        const matches = group.locations.filter(
          (loc) =>
            loc.country.toLowerCase().includes(trimmedQuery) ||
            (loc.address && loc.address.toLowerCase().includes(trimmedQuery))
        );
        return {
          ...group,
          locations: matches,
        };
      })
      .filter((g) => g.locations.length > 0);
  }, [trimmedQuery]);

  const toggleContinent = (continent: string) => {
    setOpenContinent((prev) => (prev === continent ? null : continent));
  };

  const handleCopyAddress = useCallback(async () => {
    const addr = headOffice?.address;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = addr;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setAddressCopied(true);
    window.setTimeout(() => setAddressCopied(false), 1800);
  }, [headOffice?.address]);

  // "Show on globe" action: closes directory, scrolls directly to Locations interactive view, and selects that country
  const handleShowOnGlobe = (loc: LocationNode) => {
    setActiveDialog(null);
    setSelectedCountryId(loc.id);
    window.setTimeout(() => {
      scrollToLocations();
    }, 80);
  };

  return (
    <>
      {/* Context-Aware Floating Glassmorphism Contact Pill */}
      <div
        id="floating-contact-pill-wrap"
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 transition-opacity duration-300 will-change-transform ${
          isPillVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          ref={pillRef}
          type="button"
          onClick={() => setActiveDialog('directory')}
          aria-label={pillLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`group flex h-[42px] items-center gap-2.5 rounded-full px-4 sm:px-4.5 font-sans text-xs sm:text-[13px] font-semibold tracking-wide backdrop-blur-xl border transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-2 cursor-pointer ${
            isDark
              ? 'bg-white/20 hover:bg-white/30 border-white/40 text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-sonar-cyan/70 hover:shadow-[0_8px_32px_rgba(3,197,236,0.3)] focus-visible:outline-sonar-cyan'
              : 'bg-deep-hull/90 hover:bg-signal-blue border-deep-hull/20 text-sea-salt shadow-[0_10px_28px_rgba(14,34,51,0.22)] hover:border-sonar-cyan/60 hover:shadow-[0_10px_30px_rgba(11,94,142,0.28)] focus-visible:outline-deep-teal'
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors shadow-inner ${
              isDark
                ? 'bg-white/20 text-[#F3E5AB] group-hover:bg-sonar-cyan group-hover:text-night-port'
                : 'bg-white/15 text-sonar-cyan group-hover:bg-sonar-cyan group-hover:text-night-port'
            }`}
          >
            <ChatCircleDots size={16} weight="duotone" />
          </span>
          <span className="whitespace-nowrap font-medium drop-shadow-sm">{pillLabel}</span>
        </button>
      </div>

      {/* Shared Dialog: Centered Wide Contact Directory Modal */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setActiveDialog(null)}
        title={dirCopy?.title ?? 'Contact directory'}
        triggerEl={pillRef.current}
        variant="modal"
        hideHeader
        maxWidthClassName="md:max-w-3xl"
        hashId="contact-directory"
      >
        <div className="flex flex-col gap-7 pb-4">
          {/* Top Centered GMS Logo & Title */}
          <div className="flex flex-col items-center text-center gap-2.5 border-b border-harbour-mist pb-5 pt-1 px-8">
            <img
              src="/logos/logo-trans.png"
              alt={companyName}
              draggable={false}
              className="h-11 sm:h-12 w-auto object-contain select-none"
            />
            <h3 className="font-display text-2xl sm:text-[28px] font-normal text-deep-hull leading-tight">
              {dirCopy?.title ?? 'Contact directory'}
            </h3>
          </div>

          {/* 1. Main Contacts (Structured to match the Contact section) */}
          <section aria-label={dirCopy?.main_contacts_heading ?? 'Main contacts'}>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
              {dirCopy?.main_contacts_heading ?? 'Main contacts'}
            </h4>

            <div className="mt-3 rounded-[var(--radius-md)] border border-deep-hull/10 bg-harbour-mist/30 p-5 sm:p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* Office Address */}
                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                  >
                    <MapPin size={18} weight="regular" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                      {bandCopy?.col3_title ?? 'Office Address'}
                    </h5>
                    <div className="mt-1 flex items-start justify-between gap-2.5">
                      <p className="font-sans text-[13.5px] leading-relaxed text-deep-hull/80">
                        {headOffice?.address}
                      </p>
                      {headOffice?.address && (
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          aria-label={`Copy ${headOffice.address}`}
                          className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-deep-hull/15 px-2 py-1 text-xs text-deep-hull/75 transition-colors duration-300 ease-out hover:border-[#00A9CE]/65 hover:text-[#00A9CE] min-h-[30px] cursor-pointer"
                        >
                          {addressCopied ? (
                            <>
                              <Check size={13} weight="bold" className="text-[#00A9CE]" />
                              <span className="text-[#00A9CE]">Copied</span>
                            </>
                          ) : (
                            <Copy size={13} weight="regular" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Lines */}
                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                  >
                    <Phone size={18} weight="regular" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                      {bandCopy?.col1_title ?? 'Phone Lines'}
                    </h5>
                    <div className="mt-1 flex flex-col gap-1.5">
                      {phones.map((phone) => (
                        <CopyField
                          key={phone}
                          value={phone}
                          href={`tel:${phone.replace(/\s+/g, '')}`}
                          theme="light"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* International Line */}
                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                  >
                    <InternationalPhoneIcon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                      {bandCopy?.international_title ?? 'International Line'}
                    </h5>
                    <div className="mt-1">
                      <CopyField
                        value={internationalLine}
                        href={`tel:${internationalLine.replace(/\s+/g, '')}`}
                        theme="light"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Addresses */}
                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                  >
                    <At size={18} weight="regular" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                      {bandCopy?.col2_title ?? 'Email Addresses'}
                    </h5>
                    <div className="mt-1 flex flex-col gap-1.5">
                      {emails.map((email) => (
                        <CopyField
                          key={email}
                          value={email}
                          href={`mailto:${email}`}
                          theme="light"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {dirCopy?.whatsapp_url && (
                <div className="border-t border-deep-hull/10 pt-4">
                  <a
                    href={dirCopy.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal-blue px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-sea-salt transition-colors duration-300 ease-out hover:bg-[#00A9CE]"
                  >
                    <WhatsappLogo size={16} weight="fill" />
                    <span>{dirCopy.whatsapp_label ?? 'WhatsApp us'}</span>
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* 2. By Country (Collapsed by default, Search + Continent Accordions + Country Flags & Local Times) */}
          <section aria-label={dirCopy?.countries_heading ?? 'By country'}>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
              {dirCopy?.countries_heading ?? 'By country'}
            </h4>

            {/* Instant Search Field */}
            <div className="relative mt-3">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-deep-hull/45"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a country..."
                aria-label="Search a country..."
                className="w-full rounded-full border border-deep-hull/15 bg-sea-salt py-2.5 pl-10 pr-9 font-sans text-sm text-deep-hull placeholder:text-deep-hull/45 transition-colors duration-300 ease-out focus:border-[#00A9CE] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-hull/50 transition-colors duration-300 ease-out hover:text-[#00A9CE] cursor-pointer"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Continent Accordions (Closed by default) */}
            <div className="mt-3 flex flex-col divide-y divide-deep-hull/10 rounded-[var(--radius-md)] border border-deep-hull/10 bg-sea-salt overflow-hidden">
              {filteredGroups.map((group) => {
                const isExpanded =
                  Boolean(trimmedQuery) || openContinent === group.continent;

                return (
                  <div key={group.continent} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleContinent(group.continent)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between bg-harbour-mist/25 px-4 py-3 text-left transition-colors duration-300 ease-out hover:bg-harbour-mist/45 cursor-pointer"
                    >
                      <span className="font-display text-base font-medium text-deep-hull">
                        {group.continent}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs tabular-nums text-deep-hull/55">
                          {group.locations.length}
                        </span>
                        <CaretDown
                          size={14}
                          weight="bold"
                          className={`text-deep-hull/60 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col divide-y divide-deep-hull/8 px-4">
                        {group.locations.map((loc) => {
                          const isOffice = loc.type === 'office';
                          return (
                            <div
                              key={loc.id}
                              className="py-3.5 flex flex-col gap-2"
                            >
                              {/* Country Flag + Name + Current Local Time */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ReactCountryFlag
                                    countryCode={loc.countryCode}
                                    svg
                                    aria-hidden="true"
                                    className="shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(14,34,51,0.1)]"
                                    style={{
                                      width: '18px',
                                      height: '13.5px',
                                      objectFit: 'cover',
                                    }}
                                  />
                                  <span className="truncate font-sans text-sm font-semibold text-deep-hull">
                                    {loc.country}
                                  </span>
                                </div>

                                <span className="shrink-0 font-sans text-xs tabular-nums text-deep-hull/55">
                                  {getLocalTimeAtLongitude(loc.longitude)}
                                </span>
                              </div>

                              {isOffice && loc.address && (
                                <p className="pl-[28px] font-sans text-xs text-deep-hull/70 leading-relaxed">
                                  {loc.address}
                                </p>
                              )}

                              <div className="pl-[28px] flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                {loc.phone && (
                                  <CopyField
                                    value={loc.phone}
                                    href={`tel:${loc.phone.replace(/\s+/g, '')}`}
                                    theme="light"
                                  />
                                )}
                                {loc.email && (
                                  <CopyField
                                    value={loc.email}
                                    href={`mailto:${loc.email}`}
                                    theme="light"
                                  />
                                )}
                              </div>

                              <div className="pl-[28px] pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleShowOnGlobe(loc)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-signal-blue/30 bg-signal-blue/5 px-3 py-1 font-sans text-[11px] font-semibold text-signal-blue transition-colors duration-300 ease-out hover:border-[#00A9CE] hover:bg-[#00A9CE] hover:text-sea-salt cursor-pointer"
                                >
                                  <GlobeHemisphereWest size={13} weight="duotone" />
                                  <span>
                                    {dirCopy?.show_on_globe_label ?? 'Show on globe'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </Dialog>
    </>
  );
}

export default ContactDirectory;
