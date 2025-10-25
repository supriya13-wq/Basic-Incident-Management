import sqlite3
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import json
from datetime import datetime

# Database connection
DB_FILE = 'incidents.db'

def load_data():
    """Load incident data from SQLite database"""
    conn = sqlite3.connect(DB_FILE)
    query = "SELECT * FROM incidents ORDER BY id ASC"
    df = pd.read_sql_query(query, conn)
    conn.close()
    print(f"✓ Loaded {len(df)} incidents from database\n")
    return df

def preprocess_data(df):
    """Convert data into transaction format for Apriori"""
    transactions = []
    
    for _, row in df.iterrows():
        transaction = []
        
        # Add each categorical attribute as an item
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
        
        # Handle tags (split by comma)
        if pd.notna(row['tags']):
            tags = str(row['tags']).split(',')
            for tag in tags:
                transaction.append(f"Tag:{tag.strip()}")
        
        transactions.append(transaction)
    
    print(f"✓ Preprocessed {len(transactions)} transactions\n")
    return transactions

def apply_apriori(transactions, min_support=0.05):
    """Apply Apriori algorithm to find frequent itemsets"""
    
    # Transform transactions into one-hot encoded DataFrame
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)
    
    # Apply Apriori algorithm
    print(f"⚙ Running Apriori algorithm (min_support={min_support})...")
    frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
    
    print(f"✓ Found {len(frequent_itemsets)} frequent itemsets\n")
    return frequent_itemsets, df_encoded

def generate_rules(frequent_itemsets, min_confidence=0.6, min_lift=1.2):
    """Generate association rules from frequent itemsets"""
    
    print(f"⚙ Generating association rules (min_confidence={min_confidence}, min_lift={min_lift})...")
    
    if len(frequent_itemsets) == 0:
        print("✗ No frequent itemsets found. Try lowering min_support.\n")
        return pd.DataFrame()
    
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    
    # Filter by lift
    rules = rules[rules['lift'] >= min_lift]
    
    # Sort by confidence and lift
    rules = rules.sort_values(['confidence', 'lift'], ascending=False)
    
    print(f"✓ Generated {len(rules)} association rules\n")
    return rules

def format_conclusion(rule, index):
    """Format a rule into a research-paper-ready conclusion"""
    antecedent = ', '.join(list(rule['antecedents']))
    consequent = ', '.join(list(rule['consequents']))
    confidence = rule['confidence'] * 100
    support = rule['support'] * 100
    lift = rule['lift']
    
    conclusion = f"""
Conclusion #{index}:
When incidents have [{antecedent}], 
there is a {confidence:.1f}% probability that they also have [{consequent}].
(Support: {support:.1f}%, Lift: {lift:.2f}x)
"""
    return conclusion

def generate_research_conclusions(rules, top_n=5):
    """Generate top N conclusions for research paper"""
    
    print("=" * 80)
    print("🎯 TOP RESEARCH CONCLUSIONS FOR YOUR PAPER")
    print("=" * 80)
    print()
    
    conclusions = []
    
    for i, (_, rule) in enumerate(rules.head(top_n).iterrows(), 1):
        conclusion = format_conclusion(rule, i)
        print(conclusion)
        conclusions.append({
            'conclusion_number': i,
            'antecedents': ', '.join(list(rule['antecedents'])),
            'consequents': ', '.join(list(rule['consequents'])),
            'confidence': f"{rule['confidence']*100:.1f}%",
            'support': f"{rule['support']*100:.1f}%",
            'lift': f"{rule['lift']:.2f}x"
        })
    
    return conclusions

def save_results(rules, conclusions, output_prefix='apriori_results'):
    """Save results to CSV files"""
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save all rules
    rules_file = f"{output_prefix}_all_rules_{timestamp}.csv"
    rules.to_csv(rules_file, index=False)
    print(f"✓ Saved all rules to: {rules_file}")
    
    # Save top conclusions
    conclusions_file = f"{output_prefix}_conclusions_{timestamp}.csv"
    pd.DataFrame(conclusions).to_csv(conclusions_file, index=False)
    print(f"✓ Saved conclusions to: {conclusions_file}")
    
    print()

def generate_statistics(df):
    """Generate descriptive statistics"""
    
    print("=" * 80)
    print("📊 DATASET STATISTICS")
    print("=" * 80)
    print()
    
    print(f"Total Incidents: {len(df)}")
    print()
    
    # Count by severity
    if 'severity' in df.columns:
        print("Incidents by Severity:")
        print(df['severity'].value_counts())
        print()
    
    # Count by category
    if 'category' in df.columns:
        print("Incidents by Category:")
        print(df['category'].value_counts())
        print()
    
    # Count by status
    if 'status' in df.columns:
        print("Incidents by Status:")
        print(df['status'].value_counts())
        print()
    
    # Count by website type
    if 'websiteType' in df.columns:
        print("Incidents by Website Type:")
        print(df['websiteType'].value_counts())
        print()

def main():
    """Main execution function"""
    
    print("\n" + "=" * 80)
    print("🔍 ASSOCIATION RULE MINING ANALYSIS")
    print("=" * 80)
    print()
    
    # Step 1: Load data
    df = load_data()
    
    # Step 2: Generate statistics
    generate_statistics(df)
    
    # Step 3: Preprocess data
    transactions = preprocess_data(df)
    
    # Step 4: Apply Apriori
    frequent_itemsets, df_encoded = apply_apriori(transactions, min_support=0.05)
    
    # Step 5: Generate association rules
    rules = generate_rules(frequent_itemsets, min_confidence=0.6, min_lift=1.2)
    
    if len(rules) == 0:
        print("⚠ No strong association rules found.")
        print("Try adjusting parameters:")
        print("  - Lower min_support (currently 0.05)")
        print("  - Lower min_confidence (currently 0.6)")
        print("  - Lower min_lift (currently 1.2)")
        return
    
    # Step 6: Generate research conclusions
    conclusions = generate_research_conclusions(rules, top_n=5)
    
    # Step 7: Save results
    save_results(rules, conclusions)
    
    print("=" * 80)
    print("✅ ANALYSIS COMPLETE!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Review the generated CSV files for all rules and conclusions")
    print("2. Use these conclusions in your research paper")
    print("3. Adjust parameters if needed and re-run")
    print()

if __name__ == "__main__":
    main()
