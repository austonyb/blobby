"use client"

import { Fragment } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { normalizePrefix } from "@/lib/paths"

type FileBreadcrumbsProps = {
  prefix: string
  onNavigate: (prefix: string) => void
}

export function FileBreadcrumbs({ prefix, onNavigate }: FileBreadcrumbsProps) {
  const segments = normalizePrefix(prefix).replace(/\/+$/, "").split("/").filter(Boolean)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {segments.length === 0 ? (
            <BreadcrumbPage>Files</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href="#" onClick={(event) => {
              event.preventDefault()
              onNavigate("")
            }}>
              Files
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const path = `${segments.slice(0, index + 1).join("/")}/`
          const isLast = index === segments.length - 1
          return (
            <Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{segment}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate(path)
                    }}
                  >
                    {segment}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
