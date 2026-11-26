import { useMemo, useRef, useState } from 'react';
import {
  CaretDown,
  ChatCircleDots,
  GlobeHemisphereWest,
  MagnifyingGlass,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import { useAppStore } from '../../lib/store';
import { scrollToTarget } from '../../lib/lenis';
import { Dialog } from '../../components/Dialog';
import { CopyField } from '../../components/CopyField';
import { NETWORK_DATA, type LocationNode } from '../../lib/locations';
import siteData from '../../content/site.json';

/**
 * G3: Floating Contact Button & Contact Directory (DESIGN.md Section G3)
 * - Floating glassmorphism pill fixed at bottom-right (56px tall), adapting to `navTheme` (`glass-light` vs `glass-dark`).
 * - Context-aware visibility: hidden during Preloader and Hero (`isHeroPinned`), appears after Hero with a small rise,
 *   and hides while the Contact section is on screen (`isContactVisible`), while mobile menu is open, or while a dialog is open.
 * - Morphing into Directory: expands from `pillRef` into the shared `Dialog` (`variant="drawer"`, 480px wide right panel on desktop,
 *   draggable bottom sheet on mobile) via GSAP Flip.
 * - Contents ordered most general to most specific:
 *   1. Main contacts (24/7 operations phone + General email with `CopyField` + WhatsApp button)
 *   2. By department (`Sales & RFQs · 24/7 Operations · UAE & Gulf Desk` with `CopyField`)
 *   3. By country (instant search + continent accordions from `locations.json`, with `CopyField` and a
 *      "Show on globe" button that closes the directory, scrolls to `#network`, and sets `selectedCountryId`).
 */
export function ContactDirectory() {
  const pillRef = useRef<HTMLButtonElement>(null);

  const isPreloaded = useAppStore((s) => s.isPreloaded);
  const isHeroPinned = useAppStore((s) => s.isHeroPinned);
  const isContactVisible = useAppStore((s) => s.isContactVisible);
  const isMobileMenuOpen = useAppStore((s) => s.isMobileMenuOpen);
  const navTheme = useAppStore((s) => s.navTheme);
  const activeDialog = useAppStore((s) => s.activeDialog);
  const setActiveDialog = useAppStore((s) => s.setActiveDialog);
  const setSelectedCountryId = useAppStore((s) => s.setSelectedCountryId);

  const isOpen = activeDialog === 'directory';

  const dirCopy = siteData?.contact_directory;
  const pillLabel = siteData?.navigation?.contact_pill_label ?? 'Contact us';
  const mainPhone = siteData?.contact_and_offices?.phones?.[0] ?? '';
  const mainEmail = siteData?.contact_and_offices?.emails?.[0] ?? '';
  const departments = dirCopy?.departments ?? [];

  const [activeDeptIdx, setActiveDeptIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openContinents, setOpenContinents] = useState<Record<string, boolean>>({
    Asia: true,
    Africa: true,
  });

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
            loc.city.toLowerCase().includes(trimmedQuery) ||
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
    setOpenContinents((prev) => ({
      ...prev,
      [continent]: !prev[continent],
    }));
  };

  // "Show on globe" action: closes directory, scrolls to Network, and selects that country on the 3D globe
  const handleShowOnGlobe = (loc: LocationNode) => {
    setActiveDialog(null);
    setSelectedCountryId(loc.id);
    window.setTimeout(() => {
      scrollToTarget('#network');
    }, 80);
  };

  const activeDept = departments[activeDeptIdx] ?? departments[0];

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
          className="group flex h-[42px] items-center gap-2.5 rounded-full px-4 sm:px-4.5 font-sans text-xs sm:text-[13px] font-semibold tracking-wide shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white transition-all duration-300 hover:border-sonar-cyan/70 hover:shadow-[0_8px_32px_rgba(3,197,236,0.3)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-sonar-cyan cursor-pointer"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[#F3E5AB] group-hover:bg-sonar-cyan group-hover:text-night-port transition-colors shadow-inner">
            <ChatCircleDots size={16} weight="duotone" />
          </span>
          <span className="whitespace-nowrap font-medium drop-shadow-sm">{pillLabel}</span>
        </button>
      </div>

      {/* Shared Dialog: Contact Directory Panel (480px right drawer on desktop, bottom sheet on mobile) */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setActiveDialog(null)}
        title={dirCopy?.title ?? 'Contact directory'}
        triggerEl={pillRef.current}
        variant="drawer"
        hashId="contact-directory"
      >
        <div className="flex flex-col gap-7 pb-4">
          {/* 1. Main Contacts (24/7 operations phone, General email, WhatsApp CTA) */}
          <section aria-label={dirCopy?.main_contacts_heading ?? 'Main contacts'}>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
              {dirCopy?.main_contacts_heading ?? 'Main contacts'}
            </h3>

            <div className="mt-3 flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-deep-hull/10 bg-harbour-mist/35 p-4">
              {mainPhone && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-sans text-xs font-medium text-deep-hull/70">
                    {dirCopy?.operations_label ?? '24/7 operations'}
                  </span>
                  <CopyField
                    value={mainPhone}
                    href={`tel:${mainPhone.replace(/\s+/g, '')}`}
                    theme="light"
                  />
                </div>
              )}

              {mainEmail && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-deep-hull/10 pt-2.5">
                  <span className="font-sans text-xs font-medium text-deep-hull/70">
                    {dirCopy?.general_label ?? 'General'}
                  </span>
                  <CopyField
                    value={mainEmail}
                    href={`mailto:${mainEmail}`}
                    theme="light"
                  />
                </div>
              )}

              {dirCopy?.whatsapp_url && (
                <div className="pt-2">
                  <a
                    href={dirCopy.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal-blue px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-sea-salt transition-colors hover:bg-deep-teal"
                  >
                    <WhatsappLogo size={16} weight="fill" />
                    <span>{dirCopy.whatsapp_label ?? 'WhatsApp us'}</span>
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* 2. By Department (Sales · Operations · Accounts/Regional Desk) */}
          {departments.length > 0 && (
            <section aria-label={dirCopy?.departments_heading ?? 'By department'}>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
                {dirCopy?.departments_heading ?? 'By department'}
              </h3>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {departments.map((dept, idx) => {
                  const isSelected = idx === activeDeptIdx;
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => setActiveDeptIdx(idx)}
                      className={`rounded-full px-3.5 py-1.5 font-sans text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-deep-hull text-sea-salt'
                          : 'bg-harbour-mist/50 text-deep-hull/75 hover:text-deep-hull'
                      }`}
                    >
                      {dept.name}
                    </button>
                  );
                })}
              </div>

              {activeDept && (
                <div className="mt-2.5 flex flex-col gap-2 rounded-[var(--radius-md)] border border-deep-hull/10 bg-sea-salt p-3.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-sans text-xs text-deep-hull/65">
                      Direct Email
                    </span>
                    <CopyField
                      value={activeDept.email}
                      href={`mailto:${activeDept.email}`}
                      theme="light"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-deep-hull/8 pt-2">
                    <span className="font-sans text-xs text-deep-hull/65">
                      Direct Line
                    </span>
                    <CopyField
                      value={activeDept.phone}
                      href={`tel:${activeDept.phone.replace(/\s+/g, '')}`}
                      theme="light"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 3. By Country (Instant Search + Continent Accordions + "Show on globe" buttons) */}
          <section aria-label={dirCopy?.countries_heading ?? 'By country'}>
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
                {dirCopy?.countries_heading ?? 'By country'}
              </h3>
              <span className="font-sans text-xs tabular-nums text-deep-hull/55">
                {NETWORK_DATA.allNodes.length} countries
              </span>
            </div>

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
                placeholder={
                  dirCopy?.search_placeholder ?? 'Search a country or city…'
                }
                aria-label={
                  dirCopy?.search_placeholder ?? 'Search a country or city'
                }
                className="w-full rounded-full border border-deep-hull/15 bg-sea-salt py-2.5 pl-10 pr-9 font-sans text-sm text-deep-hull placeholder:text-deep-hull/45 focus:border-signal-blue focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-hull/50 hover:text-deep-hull"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Continent Accordions */}
            <div className="mt-3 flex flex-col divide-y divide-deep-hull/10 rounded-[var(--radius-md)] border border-deep-hull/10 bg-sea-salt overflow-hidden">
              {filteredGroups.map((group) => {
                const isExpanded =
                  Boolean(trimmedQuery) || Boolean(openContinents[group.continent]);

                return (
                  <div key={group.continent} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleContinent(group.continent)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between bg-harbour-mist/25 px-4 py-3 text-left transition-colors hover:bg-harbour-mist/45"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-base font-medium text-deep-hull">
                          {group.continent}
                        </span>
                        {group.officeCount > 0 && (
                          <span className="rounded-full bg-signal-blue/12 px-2 py-0.5 font-sans text-[10px] font-semibold text-signal-blue">
                            {group.officeCount}{' '}
                            {group.officeCount === 1 ? 'office' : 'offices'}
                          </span>
                        )}
                      </div>
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
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    aria-hidden="true"
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                      isOffice
                                        ? 'bg-signal-blue ring-2 ring-signal-blue/25'
                                        : 'border-2 border-brass bg-transparent'
                                    }`}
                                  />
                                  <div>
                                    <span className="font-sans text-sm font-semibold text-deep-hull">
                                      {loc.country}
                                    </span>
                                    {loc.city && loc.city !== loc.country && (
                                      <span className="ml-1.5 font-sans text-xs text-deep-hull/60">
                                        · {loc.city}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${
                                    isOffice
                                      ? 'bg-signal-blue/12 text-signal-blue'
                                      : 'bg-brass/15 text-deep-hull/75'
                                  }`}
                                >
                                  {isOffice
                                    ? (dirCopy?.office_badge ?? 'Office')
                                    : (dirCopy?.coverage_badge ?? 'Coverage')}
                                </span>
                              </div>

                              {isOffice && loc.address && (
                                <p className="pl-4 font-sans text-xs text-deep-hull/70 leading-relaxed">
                                  {loc.address}
                                </p>
                              )}

                              {!isOffice && loc.servingOfficeCity && (
                                <p className="pl-4 font-sans text-xs text-deep-hull/65">
                                  {dirCopy?.served_by_prefix ?? 'Served by'}{' '}
                                  <span className="font-medium text-deep-hull">
                                    {loc.servingOfficeCity} ({loc.servingOfficeCountry})
                                  </span>
                                </p>
                              )}

                              <div className="pl-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
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

                              <div className="pl-4 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleShowOnGlobe(loc)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-signal-blue/30 bg-signal-blue/5 px-3 py-1 font-sans text-[11px] font-semibold text-signal-blue transition-colors hover:bg-signal-blue hover:text-sea-salt"
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
