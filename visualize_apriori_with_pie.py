import sqlite3
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import matplotlib.pyplot as plt
import seaborn as sns

DB_FILE = 'incidents.db'

def load_data():
    conn = sqlite3.connect(DB_FILE)
    query = "SELECT * FROM incidents ORDER BY id ASC"
    df = pd.read_sql_query(query, conn)
    conn.close()
    print(f"✓ Loaded {len(df)} incidents\n")
    return df

def preprocess_data(df):
    transactions = []
    for _, row in df.iterrows():
        transaction = []
        if pd.notna(row['severity']):
            transaction.append(f"Severity:{row['severity']}")
        if pd.notna(row['category']):
            transaction.append(f"Category:{row['category']}")
        if pd.notna(row['priority']):
            transaction.append(f"Priority:{row['priority']}")
        if pd.notna(row['status']):
            transaction.append(f"Status:{row['status']}")
        if pd.notna(row['websiteType']):
            transaction.append(f"WebsiteType:{row['websiteType']}")
        if pd.notna(row['incidentFrequency']):
            transaction.append(f"Frequency:{row['incidentFrequency']}")
        if pd.notna(row['serviceAffected']):
            transaction.append(f"Service:{row['serviceAffected']}")
        if pd.notna(row['rootCauseCategory']):
            transaction.append(f"RootCause:{row['rootCauseCategory']}")
        if pd.notna(row['tags']):
            tags = str(row['tags']).split(',')
            for tag in tags:
                transaction.append(f"Tag:{tag.strip()}")
        transactions.append(transaction)
    return transactions

def apply_apriori(transactions, min_support=0.05):
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)
    frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
    print(f"✓ Found {len(frequent_itemsets)} frequent itemsets\n")
    return frequent_itemsets, df_encoded

def generate_rules(frequent_itemsets, min_confidence=0.6, min_lift=1.2):
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    rules = rules[rules['lift'] >= min_lift]
    print(f"✓ Generated {len(rules)} association rules\n")
    return rules

def plot_frequent_itemsets(frequent_itemsets, top_n=10):
    top_itemsets = frequent_itemsets.sort_values('support', ascending=False).head(top_n)
    top_itemsets['itemset_str'] = top_itemsets['itemsets'].apply(lambda x: ', '.join(list(x)))
    plt.figure(figsize=(12,6))
    plt.barh(top_itemsets['itemset_str'], top_itemsets['support'], color='skyblue')
    plt.xlabel('Support')
    plt.title(f'Top {top_n} Frequent Itemsets by Support')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.show()

def plot_rules_scatter(rules):
    plt.figure(figsize=(10,6))
    sns.scatterplot(data=rules, x='support', y='confidence', size='lift', hue='lift',
                    palette='viridis', alpha=0.7, sizes=(20, 200))
    plt.title('Association Rules: Support vs Confidence (Size & Color = Lift)')
    plt.xlabel('Support')
    plt.ylabel('Confidence')
    plt.legend(title='Lift', loc='upper right')
    plt.tight_layout()
    plt.show()

def plot_website_type_pie_chart(df, threshold=3.0):
    # Count websiteType distribution (drop NaN)
    website_counts = df['websiteType'].dropna().value_counts()
    
    # Group small percentage slices as 'Other'
    total = website_counts.sum()
    small = website_counts[website_counts / total * 100 < threshold].sum()
    large = website_counts[website_counts / total * 100 >= threshold]
    
    if small > 0:
        large['Other'] = small
    
    labels = large.index
    sizes = large.values

    # Explode all slices except the largest one for clarity
    explode = [0.1 if size < max(sizes) else 0 for size in sizes]

    plt.figure(figsize=(8,8))
    wedges, texts, autotexts = plt.pie(
        sizes,
        labels=None,
        explode=explode,
        autopct='%1.1f%%',
        startangle=140,
        pctdistance=0.85,
        textprops={'fontsize': 10}
    )
    
    # Draw circle for donut chart
    centre_circle = plt.Circle((0,0),0.70,fc='white')
    fig = plt.gcf()
    fig.gca().add_artist(centre_circle)
    
    # Add legend with labels and percentage
    plt.legend(wedges, labels, title="Website Types", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    
    plt.title('Percentage Distribution of Website Types Reporting Issues')
    plt.tight_layout()
    plt.show()


def main():
    print("\nLoading incident data...")
    df = load_data()
    print("Preprocessing data...")
    transactions = preprocess_data(df)
    print("Applying Apriori algorithm...")
    frequent_itemsets, _ = apply_apriori(transactions)
    print("Generating association rules...")
    rules = generate_rules(frequent_itemsets)
    
    if len(frequent_itemsets) > 0:
        print("Plotting frequent itemsets bar chart...")
        plot_frequent_itemsets(frequent_itemsets)
    
    if len(rules) > 0:
        print("Plotting association rules scatter plot...")
        plot_rules_scatter(rules)
    
    print("Plotting website type pie chart...")
    plot_website_type_pie_chart(df)
    
    print("Visualization complete.")

if __name__ == "__main__":
    main()
