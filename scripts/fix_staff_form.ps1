$file = "c:\Vitana\Vitana Group\SMSRepoA\ui\src\components\staff\StaffForm.tsx"
$content = [IO.File]::ReadAllText($file)

# Find the end of the summary div and the start of the closing braces for step 5
# The pattern is: </div>\r\n                  </div>\r\n                </div>\r\n              )}\r\n\r\n            </div>
$searchStr = "                    </div>`r`n                  </div>`r`n                </div>`r`n              )}`r`n`r`n            </div>"

$idx = $content.IndexOf($searchStr)
Write-Host "Found at index: $idx"

if ($idx -lt 0) {
  Write-Error "Could not find anchor string"
  exit 1
}

$childrenSection = @"

                  {/* Children — edit mode only */}
                  {isEditMode && (
                    <div className="space-y-3">
                      <Separator />
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Badge variant="outline">Staff's Children (Students)</Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Link enrolled students who are children of this staff member. This enables staff-child fee concessions.
                      </p>

                      {linkedChildren.length > 0 && (
                        <div className="space-y-2">
                          {linkedChildren.map(child => (
                            <div key={child.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                              <div>
                                <p className="text-sm font-medium">{child.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Class {child.class}{child.section ? `-${child.section}` : ""}
                                  {child.admissionNumber ? ` · ${child.admissionNumber}` : ""}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive text-xs"
                                disabled={linkingChildId === child.id}
                                onClick={() => handleUnlinkChild(child)}
                              >
                                {linkingChildId === child.id ? "…" : "Unlink"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium">Search Student to Link</label>
                        <Input
                          placeholder="Type student name…"
                          value={childSearch}
                          onChange={e => {
                            setChildSearch(e.target.value);
                            searchStudentsForChild(e.target.value);
                          }}
                          className="text-sm"
                        />
                        {childSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
                        {childResults.length > 0 && (
                          <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                            {childResults
                              .filter(s => !linkedChildren.find(lc => lc.id === s.id))
                              .map(s => (
                                <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent text-sm">
                                  <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">Class {s.class}{s.section ? `-${s.section}` : ""}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    disabled={linkingChildId === s.id}
                                    onClick={() => { handleLinkChild(s); setChildSearch(""); setChildResults([]); }}
                                  >
                                    {linkingChildId === s.id ? "Linking…" : "Link as Child"}
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
"@

# The replacement puts the children section BEFORE the closing divs
$replacement = $childrenSection + "`r`n" + $searchStr

$newContent = $content.Substring(0, $idx) + $replacement + $content.Substring($idx + $searchStr.Length)

# Verify the replacement worked
if ($newContent.Contains("Staff's Children")) {
  [IO.File]::WriteAllText($file, $newContent)
  Write-Host "SUCCESS: Children section added"
} else {
  Write-Error "Replacement failed"
}
