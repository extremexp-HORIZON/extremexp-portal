import type { ImgHTMLAttributes, ReactElement } from "react"
import AccessControlPng from "../assets/access-control.png";
import DataManagementPng from "../assets/data-management.png";
import { externalLinks, type ExternalToolId } from "../config";
import { ExternalLinkButton } from "./ExternalLinkButton";

type PrepareItem = {
  title: string
  toolId: ExternalToolId
  externalUrl: string
  Icon: (props: ImgHTMLAttributes<HTMLImageElement>) => ReactElement
}

const PREPARE_ITEMS: PrepareItem[] = [
  {
    title: "Access control policy editor",
    toolId: "access-control",
    externalUrl: externalLinks.accessControlPolicyEditorUrl,
    Icon: (props) => (
      <img src={AccessControlPng} alt="" {...props} aria-hidden="true" />
    ),
  },
  {
    title: "Data managment, upload, annotate",
    toolId: "data-management",
    externalUrl: externalLinks.dataManagementUploadAnnotateUrl,
    Icon: (props) => (
      <img src={DataManagementPng} alt="" {...props} aria-hidden="true" />
    ),
  },
]

export default function Prepare() {
  return (
    <section className="card rounded-[20px] bg-base-100 shadow-sm max-w-max" data-tour="prepare">
      <div className="card-body gap-5 p-6">
        <h2 className="text-2xl font-semibold leading-tight text-neutral-900">Prepare</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PREPARE_ITEMS.map(({ title, toolId, externalUrl, Icon }) => (
            <ExternalLinkButton
              key={toolId}
              toolId={toolId}
              externalUrl={externalUrl}
              className="btn flex h-auto rounded-lg border-none bg-[#46A3FF] hover:bg-[#3B8EDB] text-white space-between"
            >
              <span className="text-left flex items-center w-full">
                <span className="flex size-[45px] my-2.5 mr-2.5 shrink-0 items-center justify-center rounded-lg bg-white">
                  <Icon className="size-9 text-neutral-900" />
                </span>
                <span className="">{title}</span>
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white transition group-hover:bg-white/60">
                <svg viewBox="0 0 20 20" fill="none" className="size-4 text-neutral-900" xmlns="http://www.w3.org/2000/svg">
                  <path d="m8 5 4 5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </ExternalLinkButton>
          ))}
        </div>
      </div>
    </section>
  )
}
