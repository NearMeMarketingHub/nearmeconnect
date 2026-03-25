// HubSpot Integration - Using Private App Token for Near Me Marketing account
import { Client } from '@hubspot/api-client';

// Get the access token from environment variable (Private App Token)
function getAccessToken(): string {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is not set');
  }
  return accessToken;
}

// Create HubSpot client using private app token
// Private app tokens don't expire like OAuth tokens, so this is safe to create each time
function getHubSpotClient() {
  const accessToken = getAccessToken();
  return new Client({ accessToken });
}

// Sync a company to HubSpot
export async function syncCompanyToHubSpot(company: {
  id: string;
  name: string;
  industry?: string | null;
  subscriptionTier: string;
  credits: number;
  monthlyCredits: number;
}) {
  try {
    const client = getHubSpotClient();
    
    // Search for existing company by name
    const searchResponse = await client.crm.companies.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'EQ' as any,
          value: company.name
        }]
      }],
      properties: ['name', 'industry', 'hs_object_id'],
      limit: 1
    });

    const properties = {
      name: company.name,
      industry: company.industry || '',
      description: `Subscription: ${company.subscriptionTier} | Credits: ${company.credits}/${company.monthlyCredits}`,
    };

    if (searchResponse.results && searchResponse.results.length > 0) {
      // Update existing company
      const hubspotId = searchResponse.results[0].id;
      await client.crm.companies.basicApi.update(hubspotId, { properties });
      return { success: true, action: 'updated', hubspotId };
    } else {
      // Create new company
      const createResponse = await client.crm.companies.basicApi.create({ 
        properties,
        associations: []
      });
      return { success: true, action: 'created', hubspotId: createResponse.id };
    }
  } catch (error: any) {
    console.error('HubSpot sync error:', error.message);
    return { success: false, error: error.message };
  }
}

// Sync a contact (company member) to HubSpot
export async function syncContactToHubSpot(contact: {
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}) {
  try {
    const client = getHubSpotClient();
    
    // Search for existing contact by email
    const searchResponse = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: contact.email
        }]
      }],
      properties: ['email', 'firstname', 'lastname', 'hs_object_id'],
      limit: 1
    });

    const properties = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      company: contact.companyName || '',
    };

    if (searchResponse.results && searchResponse.results.length > 0) {
      // Update existing contact
      const hubspotId = searchResponse.results[0].id;
      await client.crm.contacts.basicApi.update(hubspotId, { properties });
      return { success: true, action: 'updated', hubspotId };
    } else {
      // Create new contact
      const createResponse = await client.crm.contacts.basicApi.create({ 
        properties,
        associations: []
      });
      return { success: true, action: 'created', hubspotId: createResponse.id };
    }
  } catch (error: any) {
    console.error('HubSpot contact sync error:', error.message);
    return { success: false, error: error.message };
  }
}

// Create a task/activity in HubSpot
export async function createHubSpotTask(task: {
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  companyName: string;
  dueDate?: string | null;
}) {
  try {
    const client = getHubSpotClient();
    
    // Map status to HubSpot task status
    const hubspotStatus = task.status === 'completed' ? 'COMPLETED' : 
                          task.status === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED';
    
    // Map priority to HubSpot priority
    const hubspotPriority = task.priority === 'urgent' ? 'HIGH' :
                            task.priority === 'high' ? 'HIGH' :
                            task.priority === 'medium' ? 'MEDIUM' : 'LOW';
    
    const properties: Record<string, string> = {
      hs_task_subject: task.title,
      hs_task_body: task.description || '',
      hs_task_status: hubspotStatus,
      hs_task_priority: hubspotPriority,
      hs_task_type: 'TODO',
    };

    if (task.dueDate) {
      // Convert to timestamp
      properties.hs_timestamp = new Date(task.dueDate).getTime().toString();
    }

    // Find the associated company first
    let companyAssociation: any[] = [];
    try {
      const companySearch = await client.crm.companies.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'EQ' as any,
            value: task.companyName
          }]
        }],
        properties: ['name', 'hs_object_id'],
        limit: 1
      });

      if (companySearch.results && companySearch.results.length > 0) {
        companyAssociation = [{
          to: { id: companySearch.results[0].id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 192 }]
        }];
      }
    } catch (e) {
      console.log('Could not find company for association');
    }

    const createResponse = await client.crm.objects.basicApi.create('tasks', { 
      properties,
      associations: companyAssociation
    });

    return { success: true, hubspotId: createResponse.id };
  } catch (error: any) {
    console.error('HubSpot task creation error:', error.message);
    return { success: false, error: error.message };
  }
}

// Update a task status in HubSpot
export async function updateHubSpotTaskStatus(hubspotTaskId: string, status: string) {
  try {
    const client = getHubSpotClient();
    
    const hubspotStatus = status === 'completed' ? 'COMPLETED' : 
                          status === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED';
    
    await client.crm.objects.basicApi.update('tasks', hubspotTaskId, {
      properties: { hs_task_status: hubspotStatus }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('HubSpot task update error:', error.message);
    return { success: false, error: error.message };
  }
}

// Check if HubSpot is connected
export function isHubSpotConnected(): boolean {
  try {
    getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Get all companies from HubSpot
export async function getHubSpotCompanies() {
  try {
    const client = getHubSpotClient();
    const response = await client.crm.companies.basicApi.getPage(100, undefined, ['name', 'industry', 'description']);
    return { success: true, companies: response.results };
  } catch (error: any) {
    console.error('HubSpot fetch companies error:', error.message);
    return { success: false, error: error.message, companies: [] };
  }
}

// Search HubSpot companies by name
export async function searchHubSpotCompanies(query: string) {
  try {
    const client = getHubSpotClient();
    const searchResponse = await client.crm.companies.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'CONTAINS_TOKEN' as any,
          value: query
        }]
      }],
      properties: ['name', 'industry', 'description', 'domain', 'phone'],
      limit: 20
    });
    return { 
      success: true, 
      companies: searchResponse.results.map(c => ({
        id: c.id,
        name: c.properties.name || '',
        industry: c.properties.industry || '',
        description: c.properties.description || '',
        domain: c.properties.domain || '',
        phone: c.properties.phone || ''
      }))
    };
  } catch (error: any) {
    console.error('HubSpot search companies error:', error.message);
    return { success: false, error: error.message, companies: [] };
  }
}

// Get contacts associated with a HubSpot company
export async function getHubSpotCompanyContacts(hubspotCompanyId: string) {
  try {
    const client = getHubSpotClient();
    
    // Get contacts associated with this company
    const associationsResponse = await client.crm.associations.v4.basicApi.getPage(
      'company',
      hubspotCompanyId,
      'contact',
      undefined,
      100
    );
    
    if (!associationsResponse.results || associationsResponse.results.length === 0) {
      return { success: true, contacts: [] };
    }
    
    // Get contact details for each associated contact
    const contactIds = associationsResponse.results.map(a => a.toObjectId);
    const contacts: Array<{id: string; email: string; firstName: string; lastName: string}> = [];
    
    for (const contactId of contactIds) {
      try {
        const contact = await client.crm.contacts.basicApi.getById(
          contactId,
          ['email', 'firstname', 'lastname', 'phone']
        );
        contacts.push({
          id: contact.id,
          email: contact.properties.email || '',
          firstName: contact.properties.firstname || '',
          lastName: contact.properties.lastname || ''
        });
      } catch (e) {
        console.log(`Could not fetch contact ${contactId}`);
      }
    }
    
    return { success: true, contacts };
  } catch (error: any) {
    console.error('HubSpot get company contacts error:', error.message);
    return { success: false, error: error.message, contacts: [] };
  }
}

// Get a single HubSpot company by ID
export async function getHubSpotCompanyById(hubspotCompanyId: string) {
  try {
    const client = getHubSpotClient();
    const company = await client.crm.companies.basicApi.getById(
      hubspotCompanyId,
      ['name', 'industry', 'description', 'domain', 'phone']
    );
    return { 
      success: true, 
      company: {
        id: company.id,
        name: company.properties.name || '',
        industry: company.properties.industry || '',
        description: company.properties.description || '',
        domain: company.properties.domain || '',
        phone: company.properties.phone || ''
      }
    };
  } catch (error: any) {
    console.error('HubSpot get company error:', error.message);
    return { success: false, error: error.message, company: null };
  }
}

// Sync all companies and their members to HubSpot
export async function syncAllToHubSpot(
  companies: Array<{ id: string; name: string; industry?: string | null; subscriptionTier: string; credits: number; monthlyCredits: number }>,
  contacts: Array<{ email: string; firstName: string; lastName: string; companyName?: string }>
) {
  const results = {
    companies: { synced: 0, failed: 0, errors: [] as string[] },
    contacts: { synced: 0, failed: 0, errors: [] as string[] }
  };

  // Sync companies
  for (const company of companies) {
    const result = await syncCompanyToHubSpot(company);
    if (result.success) {
      results.companies.synced++;
    } else {
      results.companies.failed++;
      results.companies.errors.push(`${company.name}: ${result.error}`);
    }
  }

  // Sync contacts
  for (const contact of contacts) {
    const result = await syncContactToHubSpot(contact);
    if (result.success) {
      results.contacts.synced++;
    } else {
      results.contacts.failed++;
      results.contacts.errors.push(`${contact.email}: ${result.error}`);
    }
  }

  return results;
}
