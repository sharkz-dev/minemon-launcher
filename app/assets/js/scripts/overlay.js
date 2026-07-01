/**
 * Script for overlay.ejs
 */

/* Overlay Wrapper Functions */

/**
 * Check to see if the overlay is visible.
 * 
 * @returns {boolean} Whether or not the overlay is visible.
 */
function isOverlayVisible(){
    return document.getElementById('main').hasAttribute('overlay')
}

let overlayHandlerContent

/**
 * Overlay keydown handler for a non-dismissable overlay.
 * 
 * @param {KeyboardEvent} e The keydown event.
 */
function overlayKeyHandler (e){
    if(e.key === 'Enter' || e.key === 'Escape'){
        document.getElementById(overlayHandlerContent).getElementsByClassName('overlayKeybindEnter')[0].click()
    }
}
/**
 * Overlay keydown handler for a dismissable overlay.
 * 
 * @param {KeyboardEvent} e The keydown event.
 */
function overlayKeyDismissableHandler (e){
    if(e.key === 'Enter'){
        document.getElementById(overlayHandlerContent).getElementsByClassName('overlayKeybindEnter')[0].click()
    } else if(e.key === 'Escape'){
        document.getElementById(overlayHandlerContent).getElementsByClassName('overlayKeybindEsc')[0].click()
    }
}

/**
 * Bind overlay keydown listeners for escape and exit.
 * 
 * @param {boolean} state Whether or not to add new event listeners.
 * @param {string} content The overlay content which will be shown.
 * @param {boolean} dismissable Whether or not the overlay is dismissable 
 */
function bindOverlayKeys(state, content, dismissable){
    overlayHandlerContent = content
    document.removeEventListener('keydown', overlayKeyHandler)
    document.removeEventListener('keydown', overlayKeyDismissableHandler)
    if(state){
        if(dismissable){
            document.addEventListener('keydown', overlayKeyDismissableHandler)
        } else {
            document.addEventListener('keydown', overlayKeyHandler)
        }
    }
}

/**
 * Toggle the visibility of the overlay.
 * 
 * @param {boolean} toggleState True to display, false to hide.
 * @param {boolean} dismissable Optional. True to show the dismiss option, otherwise false.
 * @param {string} content Optional. The content div to be shown.
 */
function toggleOverlay(toggleState, dismissable = false, content = 'overlayContent'){
    if(toggleState == null){
        toggleState = !document.getElementById('main').hasAttribute('overlay')
    }
    if(typeof dismissable === 'string'){
        content = dismissable
        dismissable = false
    }
    bindOverlayKeys(toggleState, content, dismissable)
    if(toggleState){
        document.getElementById('main').setAttribute('overlay', true)
        // Make things untabbable.
        $('#main *').attr('tabindex', '-1')
        $('#' + content).parent().children().hide()
        $('#' + content).show()
        if(dismissable){
            $('#overlayDismiss').show()
        } else {
            $('#overlayDismiss').hide()
        }
        $('#overlayContainer').fadeIn({
            duration: 250,
            start: () => {
                if(getCurrentView() === VIEWS.settings){
                    document.getElementById('settingsContainer').style.backgroundColor = 'transparent'
                }
            }
        })
    } else {
        document.getElementById('main').removeAttribute('overlay')
        // Make things tabbable.
        $('#main *').removeAttr('tabindex')
        $('#overlayContainer').fadeOut({
            duration: 250,
            start: () => {
                if(getCurrentView() === VIEWS.settings){
                    document.getElementById('settingsContainer').style.backgroundColor = 'rgba(0, 0, 0, 0.50)'
                }
            },
            complete: () => {
                $('#' + content).parent().children().hide()
                $('#' + content).show()
                if(dismissable){
                    $('#overlayDismiss').show()
                } else {
                    $('#overlayDismiss').hide()
                }
            }
        })
    }
}

async function toggleServerSelection(toggleState){
    await prepareServerSelectionList()
    toggleOverlay(toggleState, true, 'serverSelectContent')
}

/**
 * Set the content of the overlay.
 * 
 * @param {string} title Overlay title text.
 * @param {string} description Overlay description text.
 * @param {string} acknowledge Acknowledge button text.
 * @param {string} dismiss Dismiss button text.
 */
function setOverlayContent(title, description, acknowledge, dismiss = Lang.queryJS('overlay.dismiss')){
    document.getElementById('overlayTitle').innerHTML = title
    document.getElementById('overlayDesc').innerHTML = description
    document.getElementById('overlayAcknowledge').innerHTML = acknowledge
    document.getElementById('overlayDismiss').innerHTML = dismiss
}

/**
 * Set the onclick handler of the overlay acknowledge button.
 * If the handler is null, a default handler will be added.
 * 
 * @param {function} handler 
 */
function setOverlayHandler(handler){
    if(handler == null){
        document.getElementById('overlayAcknowledge').onclick = () => {
            toggleOverlay(false)
        }
    } else {
        document.getElementById('overlayAcknowledge').onclick = handler
    }
}

/**
 * Set the onclick handler of the overlay dismiss button.
 * If the handler is null, a default handler will be added.
 * 
 * @param {function} handler 
 */
function setDismissHandler(handler){
    if(handler == null){
        document.getElementById('overlayDismiss').onclick = () => {
            toggleOverlay(false)
        }
    } else {
        document.getElementById('overlayDismiss').onclick = handler
    }
}

/* Server Select View */

// State for group navigation
let currentServerGroups = null
let currentGroupView = null // null = showing groups, string = showing servers in group

document.getElementById('serverSelectConfirm').addEventListener('click', async () => {
    const listings = document.getElementsByClassName('serverListing')
    for(let i=0; i<listings.length; i++){
        if(listings[i].hasAttribute('selected')){
            const serv = (await DistroAPI.getDistribution()).getServerById(listings[i].getAttribute('servid'))
            updateSelectedServer(serv)
            refreshServerStatus(true)
            toggleOverlay(false)
            currentGroupView = null // Reset view state
            return
        }
    }
    // None are selected? Not possible right? Meh, handle it.
    if(listings.length > 0){
        const serv = (await DistroAPI.getDistribution()).getServerById(listings[0].getAttribute('servid'))
        updateSelectedServer(serv)
        toggleOverlay(false)
        currentGroupView = null // Reset view state
    }
})

document.getElementById('accountSelectConfirm').addEventListener('click', async () => {
    const listings = document.getElementsByClassName('accountListing')
    for(let i=0; i<listings.length; i++){
        if(listings[i].hasAttribute('selected')){
            const authAcc = ConfigManager.setSelectedAccount(listings[i].getAttribute('uuid'))
            ConfigManager.save()
            updateSelectedAccount(authAcc)
            if(getCurrentView() === VIEWS.settings) {
                await prepareSettings()
            }
            toggleOverlay(false)
            validateSelectedAccount()
            return
        }
    }
    // None are selected? Not possible right? Meh, handle it.
    if(listings.length > 0){
        const authAcc = ConfigManager.setSelectedAccount(listings[0].getAttribute('uuid'))
        ConfigManager.save()
        updateSelectedAccount(authAcc)
        if(getCurrentView() === VIEWS.settings) {
            await prepareSettings()
        }
        toggleOverlay(false)
        validateSelectedAccount()
    }
})

// Bind server select cancel button.
document.getElementById('serverSelectCancel').addEventListener('click', () => {
    toggleOverlay(false)
    currentGroupView = null // Reset view state
})

// Bind server select back button.
document.getElementById('serverSelectBack').addEventListener('click', async () => {
    currentGroupView = null
    await populateServerListings()
    setServerListingHandlers()
})

document.getElementById('accountSelectCancel').addEventListener('click', () => {
    $('#accountSelectContent').fadeOut(250, () => {
        $('#overlayContent').fadeIn(250)
    })
})

function setServerListingHandlers(){
    const listings = Array.from(document.getElementsByClassName('serverListing'))
    listings.map((val) => {
        val.onclick = async e => {
            // Check if this is a group listing
            if(val.classList.contains('groupListing')) {
                const groupKey = val.getAttribute('groupkey')
                const group = currentServerGroups[groupKey]

                // If standalone (single server without group), select it directly and close
                if(group.standalone) {
                    const serv = (await DistroAPI.getDistribution()).getServerById(group.servers[0].rawServer.id)
                    updateSelectedServer(serv)
                    refreshServerStatus(true)
                    toggleOverlay(false)
                    currentGroupView = null
                } else {
                    // Navigate into group
                    currentGroupView = groupKey
                    await populateServerListings()
                    setServerListingHandlers()
                }
                return
            }

            // Regular server listing - select directly and close overlay
            const servId = val.getAttribute('servid')
            const serv = (await DistroAPI.getDistribution()).getServerById(servId)
            updateSelectedServer(serv)
            refreshServerStatus(true)
            toggleOverlay(false)
            currentGroupView = null
        }
    })
}

function setAccountListingHandlers(){
    const listings = Array.from(document.getElementsByClassName('accountListing'))
    listings.map((val) => {
        val.onclick = e => {
            if(val.hasAttribute('selected')){
                return
            }
            const cListings = document.getElementsByClassName('accountListing')
            for(let i=0; i<cListings.length; i++){
                if(cListings[i].hasAttribute('selected')){
                    cListings[i].removeAttribute('selected')
                }
            }
            val.setAttribute('selected', '')
            document.activeElement.blur()
        }
    })
}

/**
 * Group servers by their 'group' field.
 * Servers without a group are treated as their own group.
 */
function getServerGroups(servers) {
    const groups = {}
    for(const serv of servers) {
        const groupName = serv.rawServer.group || null
        if(groupName) {
            if(!groups[groupName]) {
                groups[groupName] = {
                    name: groupName,
                    icon: serv.rawServer.groupIcon || serv.rawServer.icon,
                    description: serv.rawServer.groupDescription || '',
                    servers: []
                }
            }
            groups[groupName].servers.push(serv)
        } else {
            // Server without group - treat as standalone
            groups['__standalone_' + serv.rawServer.id] = {
                name: serv.rawServer.name,
                icon: serv.rawServer.icon,
                description: serv.rawServer.description,
                servers: [serv],
                standalone: true
            }
        }
    }
    return groups
}

/**
 * Populate group listings (first level of selection).
 */
function populateGroupListings(groups, selectedServerId) {
    const backBtn = document.getElementById('serverSelectBack')
    backBtn.style.display = 'none'
    document.getElementById('serverSelectHeader').textContent = 'Selecciona un Modpack'

    let htmlString = ''
    for(const groupKey of Object.keys(groups)) {
        const group = groups[groupKey]
        // Check if any server in this group is selected
        const hasSelectedServer = group.servers.some(s => s.rawServer.id === selectedServerId)

        htmlString += `<button class="serverListing groupListing" groupkey="${groupKey}" ${hasSelectedServer ? 'selected' : ''}>
            <img class="serverListingImg" src="${group.icon}"/>
            <div class="serverListingDetails">
                <span class="serverListingName">${group.name}</span>
                <span class="serverListingDescription">${group.description || (group.servers.length > 1 ? group.servers.length + ' versiones disponibles' : group.servers[0].rawServer.description)}</span>
                <div class="serverListingInfo">
                    <div class="serverListingVersion">${group.servers[0].rawServer.minecraftVersion}</div>
                    ${group.servers.length > 1 ? `<div class="serverListingRevision">${group.servers.length} variantes</div>` : `<div class="serverListingRevision">${group.servers[0].rawServer.version}</div>`}
                </div>
            </div>
        </button>`
    }
    document.getElementById('serverSelectListScrollable').innerHTML = htmlString
}

/**
 * Populate server listings for a specific group (second level of selection).
 */
function populateGroupServerListings(groupName, servers, selectedServerId) {
    const backBtn = document.getElementById('serverSelectBack')
    backBtn.style.display = 'inline-block'
    document.getElementById('serverSelectHeader').textContent = groupName

    let htmlString = ''
    for(const serv of servers) {
        htmlString += `<button class="serverListing" servid="${serv.rawServer.id}" ${serv.rawServer.id === selectedServerId ? 'selected' : ''}>
            <img class="serverListingImg" src="${serv.rawServer.icon}"/>
            <div class="serverListingDetails">
                <span class="serverListingName">${serv.rawServer.name}</span>
                <span class="serverListingDescription">${serv.rawServer.description}</span>
                <div class="serverListingInfo">
                    <div class="serverListingVersion">${serv.rawServer.minecraftVersion}</div>
                    <div class="serverListingRevision">${serv.rawServer.version}</div>
                    ${serv.rawServer.mainServer ? `<div class="serverListingStarWrapper">
                        <svg id="Layer_1" viewBox="0 0 107.45 104.74" width="20px" height="20px">
                            <defs>
                                <style>.cls-1{fill:#fff;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;}</style>
                            </defs>
                            <path class="cls-1" d="M100.93,65.54C89,62,68.18,55.65,63.54,52.13c2.7-5.23,18.8-19.2,28-27.55C81.36,31.74,63.74,43.87,58.09,45.3c-2.41-5.37-3.61-26.52-4.37-39-.77,12.46-2,33.64-4.36,39-5.7-1.46-23.3-13.57-33.49-20.72,9.26,8.37,25.39,22.36,28,27.55C39.21,55.68,18.47,62,6.52,65.55c12.32-2,33.63-6.06,39.34-4.9-.16,5.87-8.41,26.16-13.11,37.69,6.1-10.89,16.52-30.16,21-33.9,4.5,3.79,14.93,23.09,21,34C70,86.84,61.73,66.48,61.59,60.65,67.36,59.49,88.64,63.52,100.93,65.54Z"/>
                            <circle class="cls-2" cx="53.73" cy="53.9" r="38"/>
                        </svg>
                        <span class="serverListingStarTooltip">${Lang.queryJS('settings.serverListing.mainServer')}</span>
                    </div>` : ''}
                </div>
            </div>
        </button>`
    }
    document.getElementById('serverSelectListScrollable').innerHTML = htmlString
}

async function populateServerListings(){
    const distro = await DistroAPI.getDistribution()
    const selectedServerId = ConfigManager.getSelectedServer()
    const servers = distro.servers

    // Group servers
    currentServerGroups = getServerGroups(servers)
    const groupKeys = Object.keys(currentServerGroups)

    // If only one group or showing specific group view
    if(currentGroupView) {
        // Show servers in selected group
        const group = currentServerGroups[currentGroupView]
        if(group) {
            populateGroupServerListings(group.name, group.servers, selectedServerId)
        }
    } else if(groupKeys.length === 1 || groupKeys.every(k => currentServerGroups[k].standalone)) {
        // Only standalone servers or single group - show servers directly (legacy behavior)
        const backBtn = document.getElementById('serverSelectBack')
        backBtn.style.display = 'none'
        document.getElementById('serverSelectHeader').textContent = Lang.queryJS('overlay.serverSelectHeader')

        let htmlString = ''
        for(const serv of servers){
            htmlString += `<button class="serverListing" servid="${serv.rawServer.id}" ${serv.rawServer.id === selectedServerId ? 'selected' : ''}>
                <img class="serverListingImg" src="${serv.rawServer.icon}"/>
                <div class="serverListingDetails">
                    <span class="serverListingName">${serv.rawServer.name}</span>
                    <span class="serverListingDescription">${serv.rawServer.description}</span>
                    <div class="serverListingInfo">
                        <div class="serverListingVersion">${serv.rawServer.minecraftVersion}</div>
                        <div class="serverListingRevision">${serv.rawServer.version}</div>
                        ${serv.rawServer.mainServer ? `<div class="serverListingStarWrapper">
                            <svg id="Layer_1" viewBox="0 0 107.45 104.74" width="20px" height="20px">
                                <defs>
                                    <style>.cls-1{fill:#fff;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;}</style>
                                </defs>
                                <path class="cls-1" d="M100.93,65.54C89,62,68.18,55.65,63.54,52.13c2.7-5.23,18.8-19.2,28-27.55C81.36,31.74,63.74,43.87,58.09,45.3c-2.41-5.37-3.61-26.52-4.37-39-.77,12.46-2,33.64-4.36,39-5.7-1.46-23.3-13.57-33.49-20.72,9.26,8.37,25.39,22.36,28,27.55C39.21,55.68,18.47,62,6.52,65.55c12.32-2,33.63-6.06,39.34-4.9-.16,5.87-8.41,26.16-13.11,37.69,6.1-10.89,16.52-30.16,21-33.9,4.5,3.79,14.93,23.09,21,34C70,86.84,61.73,66.48,61.59,60.65,67.36,59.49,88.64,63.52,100.93,65.54Z"/>
                                <circle class="cls-2" cx="53.73" cy="53.9" r="38"/>
                            </svg>
                            <span class="serverListingStarTooltip">${Lang.queryJS('settings.serverListing.mainServer')}</span>
                        </div>` : ''}
                    </div>
                </div>
            </button>`
        }
        document.getElementById('serverSelectListScrollable').innerHTML = htmlString
    } else {
        // Multiple groups - show group selection
        populateGroupListings(currentServerGroups, selectedServerId)
    }
}

function populateAccountListings(){
    const accountsObj = ConfigManager.getAuthAccounts()
    const accounts = Array.from(Object.keys(accountsObj), v=>accountsObj[v])
    let htmlString = ''
    for(let i=0; i<accounts.length; i++){
        htmlString += `<button class="accountListing" uuid="${accounts[i].uuid}" ${i===0 ? 'selected' : ''}>
            <img src="https://mc-heads.net/head/${accounts[i].uuid}/40">
            <div class="accountListingName">${accounts[i].displayName}</div>
        </button>`
    }
    document.getElementById('accountSelectListScrollable').innerHTML = htmlString

}

async function prepareServerSelectionList(){
    await populateServerListings()
    setServerListingHandlers()
    // Ocultar botón confirmar - selección es directa al hacer click
    document.getElementById('serverSelectConfirm').style.display = 'none'
}

function prepareAccountSelectionList(){
    populateAccountListings()
    setAccountListingHandlers()
}